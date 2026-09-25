"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, Archive, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardPlus, EllipsisVertical, Eye, FileClock, HeartPulse, LoaderCircle,
  MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, UserRoundX, UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, formatDate, Modal, readableErrors, Select, Textarea } from "@/components/pharmacy-ui";
import { hasRole } from "@/lib/roles";

// ============= CONSTANTS =============
const ACCESS_ROLES = ["administrator", "reception", "laboratory", "manager", "clinician", "pharmacy"];
const WRITE_ROLES = ["administrator", "reception", "laboratory"];
const HISTORY_ROLES = ["administrator", "laboratory", "manager", "clinician"];
const NOTE_READ_ROLES = ["administrator", "laboratory", "manager", "clinician"];
const NOTE_WRITE_ROLES = ["administrator", "laboratory", "clinician"];
const MANAGE_ROLES = ["administrator", "manager"];

const GENDERS = [
  ["male", "Male"], 
  ["female", "Female"], 
  ["other", "Other"], 
  ["unknown", "Unknown"]
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => [v, v]);
const NOTE_TYPES = [
  ["general", "General"], 
  ["clinical", "Clinical"], 
  ["allergy", "Allergy"], 
  ["administrative", "Administrative"]
];

const EMPTY_PATIENT = { 
  first_name: "", 
  last_name: "", 
  father_name: "", 
  date_of_birth: "", 
  gender: "unknown", 
  phone: "", 
  national_id: "", 
  address: "", 
  blood_group: "", 
  allergies: "", 
  emergency_contact_name: "", 
  emergency_contact_phone: "" 
};

// ============= UTILITY FUNCTIONS =============
async function patientApi(path, options) {
  let response;
  try { 
    response = await fetch(`/api/patients/${path}`, options); 
  } catch { 
    throw new Error("The hospital server could not be reached."); 
  }
  
  let data = null;
  if (response.status !== 204) {
    data = await response.json().catch(() => null);
  }
  
  if (!response.ok) {
    const details = data?.errors ?? data;
    const messages = readableErrors(details, response.status);
    const error = new Error(messages[0] || data?.message || "The request could not be completed.");
    error.status = response.status;
    error.fields = details;
    error.messages = messages;
    throw error;
  }
  
  return data;
}

const rows = (data) => Array.isArray(data) ? data : data?.results || [];
const labelize = (value) => String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function jsonOptions(method, body) { 
  return { 
    method, 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(body) 
  }; 
}

function today() { 
  const value = new Date(); 
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; 
}

export default function PatientsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ count: 0, next: null, previous: null });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ gender: "", blood_group: "", state: "active", date_of_birth_from: "", date_of_birth_to: "", created_from: "", created_to: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    void refreshKey;
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), ordering: "first_name" });
    if (query.trim()) params.set("search", query.trim());
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.blood_group) params.set("blood_group", filters.blood_group);
    if (filters.date_of_birth_from) params.set("date_of_birth_from", filters.date_of_birth_from);
    if (filters.date_of_birth_to) params.set("date_of_birth_to", filters.date_of_birth_to);
    if (filters.created_from) params.set("created_from", filters.created_from);
    if (filters.created_to) params.set("created_to", filters.created_to);
    if (filters.state === "inactive") { params.set("is_active", "false"); params.set("include_inactive", "false"); }
    if (filters.state === "all") params.set("include_inactive", "true");
    try {
      const data = await patientApi(`patients/?${params}`);
      setItems(rows(data));
      setMeta({ count: data?.count ?? rows(data).length, next: data?.next, previous: data?.previous });
    } catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, [filters, page, query, refreshKey]);

  useEffect(() => {
    // Fetching the current server-side patient list is this synchronization effect's purpose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const stats = useMemo(() => ({
    active: items.filter((item) => item.is_active).length,
    allergies: items.filter((item) => item.blood_group).length,
  }), [items]);

  if (!hasRole(user, ...ACCESS_ROLES)) return <Denied />;

  function open(mode, item = null) { setSelected(item); setDialog(mode); }
  function completed(message) {
    setDialog(null); setSelected(null); setNotice(message); setRefreshKey((v) => v + 1);
  }

  return (
    <div className="operations-section">
      <div className="mb-7 flex flex-col justify-between gap-5 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:px-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Patient administration</p>
          <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Patients</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Register patients, maintain demographics, review clinical history, and manage patient notes.</p>
        </div>
        {hasRole(user, ...WRITE_ROLES) && <Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => open("create")}><Plus /> Register patient</Button>}
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription className="flex items-center justify-between gap-3">{error}<Button variant="outline" size="sm" onClick={load}>Retry</Button></AlertDescription></Alert>}
      {notice && <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="text-emerald-600 dark:text-emerald-300" /><AlertDescription className="text-emerald-800 dark:text-emerald-300">{notice}</AlertDescription></Alert>}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Summary label="Total matching" value={meta.count} icon={UsersRound} />
        <Summary label="Active on page" value={stats.active} icon={Activity} tone="emerald" />
        <Summary label="Blood group recorded" value={stats.allergies} icon={HeartPulse} tone="rose" />
      </div>

      <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4">
          <div className="relative min-w-[230px] flex-[2_1_300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input className="pl-9" value={query} placeholder="MRN, name, father, phone or national ID…" onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <Select className="min-w-36 flex-1" value={filters.state} placeholder="Patient state" options={[["active", "Active"], ["inactive", "Inactive"], ["all", "All records"]]} onChange={(v) => updateFilter("state", v)} />
          <Select className="min-w-36 flex-1" value={filters.gender} placeholder="Any gender" options={GENDERS} onChange={(v) => updateFilter("gender", v)} />
          <Select className="min-w-36 flex-1" value={filters.blood_group} placeholder="Any blood group" options={BLOOD_GROUPS} onChange={(v) => updateFilter("blood_group", v)} />
          <Button variant="outline" size="icon" aria-label="Refresh patients" onClick={() => setRefreshKey((v) => v + 1)}><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
        </div>
        <div className="grid gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Born from"><DatePicker value={filters.date_of_birth_from} onChange={(value) => updateFilter("date_of_birth_from", value)} /></Field>
          <Field label="Born to"><DatePicker value={filters.date_of_birth_to} onChange={(value) => updateFilter("date_of_birth_to", value)} /></Field>
          <Field label="Registered from"><DatePicker value={filters.created_from} onChange={(value) => updateFilter("created_from", value)} /></Field>
          <Field label="Registered to"><DatePicker value={filters.created_to} onChange={(value) => updateFilter("created_to", value)} /></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="operations-table w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"><tr>{["Patient", "MRN", "Father name", "Age / gender", "Phone", "Blood", "Status", ""].map((h, i) => <th key={`${h}-${i}`} className="px-5 py-3.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <EmptyRow columns={8}><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading patients…</EmptyRow>
                : !items.length ? <EmptyRow columns={8}>No patients match these filters.</EmptyRow>
                : items.map((item) => <PatientRow key={item.id} item={item} user={user} open={open} />)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{meta.count} total · Page {page}</span>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!meta.previous || loading} onClick={() => setPage((v) => v - 1)}><ChevronLeft /> Previous</Button><Button size="sm" variant="outline" disabled={!meta.next || loading} onClick={() => setPage((v) => v + 1)}>Next <ChevronRight /></Button></div>
        </div>
      </Card>

      {dialog === "create" && <PatientForm onClose={() => setDialog(null)} saved={() => completed("Patient registered successfully.")} />}
      {dialog === "edit" && <PatientForm patientId={selected.id} onClose={() => setDialog(null)} saved={() => completed("Patient information updated.")} />}
      {dialog === "detail" && <PatientDetail patientId={selected.id} user={user} onClose={() => setDialog(null)} notify={(message) => { setNotice(message); setRefreshKey((v) => v + 1); }} />}
      {dialog === "deactivate" && <ReasonDialog title="Deactivate patient" description="The record remains available for audit and can be reactivated later." actionLabel="Deactivate patient" onClose={() => setDialog(null)} onSubmit={(reason) => patientApi(`patients/${selected.id}/`, jsonOptions("DELETE", { reason }))} saved={() => completed("Patient deactivated.")} />}
      {dialog === "reactivate" && <ConfirmDialog title="Reactivate patient" description="This patient can be edited and receive new notes again." actionLabel="Reactivate" onClose={() => setDialog(null)} onConfirm={() => patientApi(`patients/${selected.id}/reactivate/`, jsonOptions("POST", {}))} saved={() => completed("Patient reactivated.")} />}
    </div>
  );

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); }
}

function PatientRow({ item, user, open }) {
  return <tr className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-cyan-50/40">
    <td className="px-5 py-4"><button className="text-left font-semibold text-slate-900 dark:text-slate-100 hover:text-cyan-700" onClick={() => open("detail", item)}>{item.full_name}</button></td>
    <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{item.medical_record_number}</td>
    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{item.father_name || "—"}</td>
    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{item.age ?? "—"} · {labelize(item.gender)}</td>
    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{item.phone || "—"}</td>
    <td className="px-5 py-4"><Badge variant="outline">{item.blood_group || "Unknown"}</Badge></td>
    <td className="px-5 py-4"><Badge className={item.is_active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"} variant="secondary">{item.is_active ? "Active" : "Inactive"}</Badge></td>
    <td className="px-5 py-4 text-right">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.full_name}`} title="Actions" className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1.5">
          <DropdownMenuItem onClick={() => open("detail", item)}><Eye /> View patient</DropdownMenuItem>
          {item.is_active && hasRole(user, ...WRITE_ROLES) && <DropdownMenuItem onClick={() => open("edit", item)}><Pencil /> Edit patient</DropdownMenuItem>}
          {item.is_active && hasRole(user, ...MANAGE_ROLES) && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => open("deactivate", item)}><UserRoundX /> Deactivate</DropdownMenuItem></>}
          {!item.is_active && hasRole(user, ...MANAGE_ROLES) && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => open("reactivate", item)}><RotateCcw /> Reactivate</DropdownMenuItem></>}
        </DropdownMenuContent>
      </DropdownMenu>
    </td>
  </tr>;
}

function PatientForm({ patientId, onClose, saved }) {
  const [form, setForm] = useState(EMPTY_PATIENT);
  const [loading, setLoading] = useState(Boolean(patientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    patientApi(`patients/${patientId}/`).then((data) => setForm(Object.fromEntries(Object.keys(EMPTY_PATIENT).map((key) => [key, data[key] ?? ""])))).catch(setError).finally(() => setLoading(false));
  }, [patientId]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    const payload = { ...form, date_of_birth: form.date_of_birth || null, confirm_possible_duplicate: confirmed };
    try {
      await patientApi(patientId ? `patients/${patientId}/` : "patients/", jsonOptions(patientId ? "PATCH" : "POST", payload));
      saved();
    } catch (reason) {
      setError(reason);
      const possible = reason.fields?.possible_duplicates || reason.fields?.errors?.possible_duplicates;
      if (Array.isArray(possible)) setDuplicates(possible);
    } finally { setSaving(false); }
  }

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <Modal title={patientId ? "Edit patient" : "Register patient"} subtitle="Identity, contact, and safety information" onClose={onClose} wide>
    {loading ? <div className="py-20 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading patient…</div> : <form onSubmit={submit} className="space-y-6">
      {error && <FormError error={error} />}
      {duplicates.length > 0 && <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40"><ShieldAlert className="text-amber-700 dark:text-amber-300" /><AlertDescription><strong className="text-amber-900 dark:text-amber-300">Possible duplicate patients found</strong><ul className="mt-2 space-y-1">{duplicates.map((d) => <li key={d.id}>{d.medical_record_number} · {d.full_name}</li>)}</ul><label className="mt-3 flex items-center gap-2 font-medium text-amber-900 dark:text-amber-300"><Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />I confirmed this is a different patient</label></AlertDescription></Alert>}
      <FormSection title="Identity"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Field label="First name"><Input required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field><Field label="Last name"><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field><Field label="Father name"><Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} /></Field><Field label="Date of birth"><DatePicker value={form.date_of_birth} onChange={(value) => set("date_of_birth", value)} /></Field><Field label="Gender"><Select required value={form.gender} options={GENDERS} onChange={(v) => set("gender", v)} /></Field><Field label="National ID"><Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} /></Field></div></FormSection>
      <FormSection title="Contact"><div className="grid gap-4 md:grid-cols-2"><Field label="Phone"><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field><Field label="Address"><Textarea className="min-h-11" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field><Field label="Emergency contact"><Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} /></Field><Field label="Emergency phone"><Input type="tel" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} /></Field></div></FormSection>
      <FormSection title="Clinical safety"><div className="grid gap-4 md:grid-cols-[220px_1fr]"><Field label="Blood group"><Select value={form.blood_group} placeholder="Not recorded" options={BLOOD_GROUPS} onChange={(v) => set("blood_group", v)} /></Field><Field label="Allergies"><Textarea value={form.allergies} placeholder="Known allergies or sensitivities" onChange={(e) => set("allergies", e.target.value)} /></Field></div></FormSection>
      <Actions onClose={onClose} saving={saving} label={patientId ? "Save changes" : "Register patient"} disabled={duplicates.length > 0 && !confirmed} />
    </form>}
  </Modal>;
}

function PatientDetail({ patientId, user, onClose, notify }) {
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteEditor, setNoteEditor] = useState(null);
  const [noteToArchive, setNoteToArchive] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    // Refreshing the selected server-side record is this synchronization effect's purpose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError("");
    patientApi(`patients/${patientId}/`).then(setPatient).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [patientId, refresh]);

  useEffect(() => {
    if (tab !== "history" || history || !hasRole(user, ...HISTORY_ROLES)) return;
    patientApi(`patients/${patientId}/history/?page_size=25`).then(setHistory).catch((e) => setError(e.message));
  }, [history, patientId, tab, user]);

  function noteSaved(message) { setNoteEditor(null); setRefresh((v) => v + 1); notify(message); }
  return <Modal title={patient?.full_name || "Patient record"} subtitle={patient?.medical_record_number} onClose={onClose} wide>
    {loading ? <div className="py-20 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading record…</div> : error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : <>
      {!patient.is_active && <Alert className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40"><ShieldAlert className="text-amber-700 dark:text-amber-300" /><AlertDescription>This record is inactive. {patient.deactivation_reason && `Reason: ${patient.deactivation_reason}`}</AlertDescription></Alert>}
      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700 pb-3"><Tab active={tab === "profile"} onClick={() => setTab("profile")} icon={UsersRound}>Profile</Tab>{hasRole(user, ...NOTE_READ_ROLES) && <Tab active={tab === "notes"} onClick={() => setTab("notes")} icon={ClipboardPlus}>Notes ({patient.notes?.length || 0})</Tab>}{hasRole(user, ...HISTORY_ROLES) && <Tab active={tab === "history"} onClick={() => setTab("history")} icon={FileClock}>History</Tab>}</div>
      {tab === "profile" && <Profile patient={patient} />}
      {tab === "notes" && <Notes patient={patient} user={user} edit={setNoteEditor} archive={setNoteToArchive} />}
      {tab === "history" && <History data={history} />}
      {tab === "notes" && patient.is_active && hasRole(user, ...NOTE_WRITE_ROLES) && <div className="mt-5 flex justify-end"><Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => setNoteEditor("new")}><Plus /> Add note</Button></div>}
      {noteEditor && <NoteForm patient={patient} note={noteEditor === "new" ? null : noteEditor} onClose={() => setNoteEditor(null)} saved={() => noteSaved(noteEditor === "new" ? "Patient note added." : "Patient note amended.")} />}
      {noteToArchive && <ReasonDialog title="Archive patient note" description="Archived notes remain in the audit record and are removed from the active patient view." actionLabel="Archive note" onClose={() => setNoteToArchive(null)} onSubmit={(reason) => patientApi(`patient-notes/${noteToArchive.id}/`, jsonOptions("DELETE", { reason }))} saved={() => { setNoteToArchive(null); setRefresh((v) => v + 1); notify("Patient note archived."); }} />}
    </>}
  </Modal>;
}

function Profile({ patient }) {
  const fields = [["Medical record number", patient.medical_record_number], ["Full name", patient.full_name], ["Father name", patient.father_name], ["Date of birth", formatDate(patient.date_of_birth)], ["Age", patient.age], ["Gender", labelize(patient.gender)], ["National ID", patient.national_id], ["Phone", patient.phone], ["Address", patient.address], ["Blood group", patient.blood_group], ["Emergency contact", patient.emergency_contact_name], ["Emergency phone", patient.emergency_contact_phone], ["Registered", formatDate(patient.created_at, true)], ["Last updated", formatDate(patient.updated_at, true)]];
  return <div className="space-y-5">{patient.allergies && <Alert className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"><HeartPulse className="text-rose-600 dark:text-rose-300" /><AlertDescription><strong className="block text-rose-900 dark:text-rose-300">Allergies</strong>{patient.allergies}</AlertDescription></Alert>}<div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="bg-white dark:bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p><p className="mt-1 break-words font-medium text-slate-800 dark:text-slate-200">{value || "—"}</p></div>)}</div></div>;
}

function Notes({ patient, user, edit, archive }) {
  if (!patient.notes?.length) return <EmptyPanel icon={ClipboardPlus} text="No visible notes for this patient." />;
  return <div className="space-y-3">{patient.notes.map((note) => <div key={note.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="secondary">{labelize(note.note_type)}</Badge>{note.is_confidential && <Badge className="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300" variant="secondary">Confidential</Badge>}<span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{formatDate(note.created_at, true)}</span></div><p className="whitespace-pre-wrap leading-6 text-slate-700 dark:text-slate-300">{note.note}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400"><span>By {note.author_name || "Unknown"}{note.amended_at ? ` · amended ${formatDate(note.amended_at, true)}` : ""}</span><div className="flex gap-1">{hasRole(user, ...NOTE_WRITE_ROLES) && <Button size="sm" variant="ghost" onClick={() => edit(note)}><Pencil /> Amend</Button>}{hasRole(user, ...MANAGE_ROLES) && <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-300" onClick={() => archive(note)}><Archive /> Archive</Button>}</div></div></div>)}</div>;
}

function History({ data }) {
  if (!data) return <div className="py-16 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading history…</div>;
  return <div className="space-y-6"><HistorySection title="Visits" count={data.visits?.count} items={data.visits?.results} render={(visit) => <div key={visit.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{visit.visit_number}</strong><Badge variant="secondary">{labelize(visit.status)}</Badge></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(visit.date, true)} · {visit.department} · {visit.provider || "No provider"}</p><p className="mt-3 text-sm">{visit.services?.map((s) => s.name).join(", ") || "No service lines"}</p><p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Balance: AFN {visit.balance_due}</p></div>} /><HistorySection title="Laboratory orders" count={data.laboratory_orders?.count} items={data.laboratory_orders?.results} render={(order) => <div key={order.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{order.order_number}</strong><Badge variant="secondary">{labelize(order.status)}</Badge></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(order.ordered_at, true)}{order.visit_number ? ` · ${order.visit_number}` : ""}</p><div className="mt-3 space-y-2">{order.items?.map((item, i) => <p key={i} className={item.is_abnormal ? "text-sm font-semibold text-red-700 dark:text-red-300" : "text-sm text-slate-700 dark:text-slate-300"}>{item.test}: {item.result || "Pending"} {item.unit || ""}{item.is_abnormal ? " · Abnormal" : ""}</p>)}</div></div>} /></div>;
}

function NoteForm({ patient, note, onClose, saved }) {
  const [form, setForm] = useState({ note_type: note?.note_type || "general", note: note?.note || "", is_confidential: note?.is_confidential ?? true });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { await patientApi(note ? `patient-notes/${note.id}/` : "patient-notes/", jsonOptions(note ? "PATCH" : "POST", { ...form, ...(!note ? { patient: patient.id } : {}) })); saved(); } catch (reason) { setError(reason); } finally { setSaving(false); } }
  return <Modal title={note ? "Amend note" : "Add patient note"} subtitle={`${patient.full_name} · ${patient.medical_record_number}`} onClose={onClose}><form className="space-y-5" onSubmit={submit}>{error && <FormError error={error} />}<Field label="Note type"><Select required value={form.note_type} options={NOTE_TYPES} onChange={(v) => setForm({ ...form, note_type: v })} /></Field><Field label="Note"><Textarea required className="min-h-40" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><Checkbox checked={form.is_confidential} onCheckedChange={(v) => setForm({ ...form, is_confidential: Boolean(v) })} />Confidential clinical note</label><Actions onClose={onClose} saving={saving} label={note ? "Save amendment" : "Add note"} /></form></Modal>;
}

function ReasonDialog({ title, description, actionLabel, onClose, onSubmit, saved }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { await onSubmit(reason); saved(); } catch (value) { setError(value); } finally { setSaving(false); } }
  return <Modal title={title} subtitle={description} onClose={onClose}><form className="space-y-5" onSubmit={submit}>{error && <FormError error={error} />}<Field label="Reason"><Textarea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Actions onClose={onClose} saving={saving} label={actionLabel} danger /></form></Modal>;
}

function ConfirmDialog({ title, description, actionLabel, onClose, onConfirm, saved }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  async function confirm() { setSaving(true); setError(null); try { await onConfirm(); saved(); } catch (value) { setError(value); } finally { setSaving(false); } }
  return <Modal title={title} subtitle={description} onClose={onClose}><div className="space-y-5">{error && <FormError error={error} />}<Actions onClose={onClose} saving={saving} label={actionLabel} onSubmit={confirm} /></div></Modal>;
}

function Summary({ label, value, icon: Icon, tone = "cyan" }) { const colors = { cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300", emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", rose: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" }; return <Card className="flex-row items-center gap-4 border-slate-200 dark:border-slate-700 p-5 shadow-sm"><span className={`flex size-11 items-center justify-center rounded-xl ${colors[tone]}`}><Icon /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-50">{value}</p></div></Card>; }
function FormSection({ title, children }) { return <section><h3 className="mb-3 border-b border-slate-200 dark:border-slate-700 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>{children}</section>; }
function FormError({ error }) { const messages = error?.messages?.length ? error.messages : [error?.message || "The information could not be saved."]; return <Alert variant="destructive"><AlertCircle /><AlertDescription><strong>We couldn&apos;t save this information.</strong><ul className="mt-2 list-disc pl-5">{messages.map((m, i) => <li key={`${m}-${i}`}>{m}</li>)}</ul></AlertDescription></Alert>; }
function Actions({ onClose, saving, label, danger, disabled, onSubmit }) { return <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type={onSubmit ? "button" : "submit"} onClick={onSubmit} disabled={saving || disabled} variant={danger ? "destructive" : "default"} className={danger ? "" : "bg-cyan-700 hover:bg-cyan-800"}>{saving && <LoaderCircle className="animate-spin" />}{label}</Button></div>; }
function EmptyRow({ columns, children }) { return <tr><td colSpan={columns} className="py-16 text-center text-slate-500 dark:text-slate-400">{children}</td></tr>; }
function EmptyPanel({ icon: Icon, text }) { return <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 py-14 text-center text-slate-500 dark:text-slate-400"><Icon className="mx-auto mb-3" /><p>{text}</p></div>; }
function Tab({ active, icon: Icon, children, onClick }) { return <Button variant={active ? "default" : "ghost"} className={active ? "bg-cyan-700 hover:bg-cyan-800" : "text-slate-600 dark:text-slate-300"} onClick={onClick}><Icon />{children}</Button>; }
function HistorySection({ title, count, items = [], render }) { return <section><h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{title} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({count || 0})</span></h3>{items.length ? <div className="space-y-3">{items.map(render)}</div> : <EmptyPanel icon={CalendarDays} text={`No ${title.toLowerCase()} found.`} />}</section>; }
function Denied() { return <Alert variant="destructive"><AlertCircle /><AlertDescription>You do not have access to patient records.</AlertDescription></Alert>; }
