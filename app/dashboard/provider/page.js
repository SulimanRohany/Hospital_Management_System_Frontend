"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, FileText, LoaderCircle, Play, RefreshCw, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasRole, withSectionRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/pharmacy-ui";

const labels = { registered: "Waiting", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const tones = { registered: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", in_progress: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300", completed: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" };

function rows(data) { return data?.results || data || []; }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function time(value) { const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en"; const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`; return value ? new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—"; }

async function request(path, options) {
  const response = await fetch(path, { cache: "no-store", ...options, headers: options?.body ? { "Content-Type": "application/json" } : undefined });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "The request could not be completed.");
  return data;
}

function Status({ value }) { return <Badge variant="secondary" className={tones[value]}>{labels[value] || value}</Badge>; }

export default function ProviderPage() {
  const { user: account } = useAuth();
  const user = withSectionRole(account, "clinician");
  const [visits, setVisits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true); setError("");
    try {
      const data = await request(`/api/reception/receptions?date=${today()}&ordering=visit_date&page_size=100`);
      const items = rows(data);
      setVisits(items);
      setSelected((current) => items.find((item) => item.id === current?.id) || items.find((item) => item.status === "in_progress") || items[0] || null);
    } catch (reason) { setError(reason.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    request(`/api/reception/receptions?date=${today()}&ordering=visit_date&page_size=100`)
      .then((data) => {
        if (!active) return;
        const items = rows(data);
        setVisits(items);
        setSelected(items.find((item) => item.status === "in_progress") || items[0] || null);
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({ waiting: visits.filter((v) => v.status === "registered").length, active: visits.filter((v) => v.status === "in_progress").length, done: visits.filter((v) => v.status === "completed").length }), [visits]);

  async function transition(action) {
    if (!selected) return;
    setBusy(action); setError(""); setNotice("");
    try {
      const updated = await request(`/api/reception/receptions/${selected.id}/${action}`, { method: "POST", body: "{}" });
      setSelected(updated); setNotice(action === "start" ? "Visit started." : "Visit completed."); await load();
    } catch (reason) { setError(reason.message); } finally { setBusy(""); }
  }

  async function saveNote() {
    if (!selected || !note.trim()) return;
    setBusy("note"); setError(""); setNotice("");
    try {
      await request("/api/patients/patient-notes", { method: "POST", body: JSON.stringify({ patient: selected.patient, note: note.trim(), is_confidential: true }) });
      setNote(""); setNotice("Clinical note saved to the patient record.");
    } catch (reason) { setError(reason.message); } finally { setBusy(""); }
  }

  if (!hasRole(user, "clinician", "administrator")) return <Alert variant="destructive"><AlertDescription>This workspace is available to clinical providers.</AlertDescription></Alert>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700 dark:text-cyan-300">Clinical care</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Provider workspace</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your assigned visits for today, clinical notes, and visit progress.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button></div>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {notice && <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"><CheckCircle2 /><AlertDescription>{notice}</AlertDescription></Alert>}
    <div className="grid gap-4 sm:grid-cols-3">
      {[ ["Waiting", counts.waiting, Clock3, "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"], ["In progress", counts.active, Activity, "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"], ["Completed today", counts.done, CheckCircle2, "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"] ].map(([label, value, Icon, tone]) => <Card key={label}><CardContent className="flex items-center gap-4"><span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon /></span><div><p className="text-2xl font-semibold">{loading ? "—" : value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div></CardContent></Card>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.8fr)]">
      <Card className="gap-0 py-0"><CardHeader className="border-b py-4"><CardTitle>My patient queue</CardTitle><p className="text-xs text-slate-500 dark:text-slate-400">Only visits assigned to your provider account are shown.</p></CardHeader><div className="divide-y">
        {loading ? <p className="p-10 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading assigned visits…</p> : !visits.length ? <div className="p-12 text-center"><CheckCircle2 className="mx-auto size-9 text-emerald-500" /><p className="mt-3 font-medium">No visits assigned today</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New assignments from reception will appear here.</p></div> : visits.map((visit) => <button key={visit.id} type="button" onClick={() => { setSelected(visit); setNotice(""); }} className={`flex w-full items-center gap-4 p-4 text-left transition hover:bg-cyan-50/50 ${selected?.id === visit.id ? "bg-cyan-50/70 dark:bg-cyan-950/40" : ""}`}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><UserRound /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{visit.patient_name}</strong><small className="block truncate text-slate-500 dark:text-slate-400">{visit.visit_number} · {time(visit.visit_date)} · {visit.department_name}</small></span><Status value={visit.status} /></button>)}
      </div></Card>
      <Card className="gap-0 py-0"><CardHeader className="border-b py-4"><CardTitle>{selected ? selected.patient_name : "Visit details"}</CardTitle><p className="text-xs text-slate-500 dark:text-slate-400">{selected ? `${selected.visit_number} · ${selected.department_name}` : "Select an assigned visit."}</p></CardHeader><CardContent className="py-5">
        {!selected ? <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No visit selected.</p> : <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 text-sm"><div><p className="text-xs text-slate-500 dark:text-slate-400">Room</p><p className="mt-1 font-medium">{selected.room || "Not assigned"}</p></div><div><p className="text-xs text-slate-500 dark:text-slate-400">Visit type</p><p className="mt-1 font-medium capitalize">{selected.visit_type?.replaceAll("_", " ")}</p></div><div><p className="text-xs text-slate-500 dark:text-slate-400">Payment</p><p className="mt-1 font-medium capitalize">{selected.payment_status?.replaceAll("_", " ")}</p></div><div><p className="text-xs text-slate-500 dark:text-slate-400">Status</p><div className="mt-1"><Status value={selected.status} /></div></div></div>
          <section><h3 className="flex items-center gap-2 text-sm font-semibold"><Stethoscope className="size-4 text-cyan-700 dark:text-cyan-300" />Services</h3><ul className="mt-2 space-y-2">{selected.service_lines?.map((line) => <li key={line.id} className="rounded-lg border px-3 py-2 text-sm">{line.service_name} <span className="text-slate-400 dark:text-slate-500">× {line.quantity}</span></li>)}</ul></section>
          {selected.notes && <section><h3 className="text-sm font-semibold">Reception notes</h3><p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 text-sm text-slate-700 dark:text-slate-300">{selected.notes}</p></section>}
          {!['completed','cancelled'].includes(selected.status) && <section className="border-t pt-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-cyan-700 dark:text-cyan-300" />Add confidential clinical note</h3><Textarea className="mt-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Assessment, diagnosis, treatment, or follow-up instructions…" /><Button className="mt-2" variant="outline" onClick={saveNote} disabled={!note.trim() || busy === "note"}>{busy === "note" && <LoaderCircle className="animate-spin" />}Save note</Button></section>}
          <div className="flex justify-end gap-2 border-t pt-5">{selected.status === "registered" && <Button onClick={() => transition("start")} disabled={Boolean(busy)}><Play />Start visit</Button>}{selected.status === "in_progress" && <Button onClick={() => transition("complete")} disabled={Boolean(busy)}>{busy === "complete" ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}Complete visit</Button>}</div>
        </div>}
      </CardContent></Card>
    </div>
  </div>;
}
