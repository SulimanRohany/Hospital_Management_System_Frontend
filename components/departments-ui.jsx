"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertCircle, Archive, Building2, CheckCircle2, CircleDollarSign,
  FlaskConical, History, LoaderCircle, MoreHorizontal, Pencil, Plus, RefreshCw,
  Search, Stethoscope, ToggleLeft, Wrench,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, formatDate, Modal, money, rows, Select, Textarea } from "@/components/pharmacy-ui";

const READ_ROLES = ["administrator", "reception", "laboratory", "pharmacy", "finance", "manager", "hr", "clinician"];

async function catalogApi(path, options = {}) {
  let response;
  try { response = await fetch(`/api/departments/${path}`, options); }
  catch { throw new Error("The hospital server could not be reached."); }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "The request could not be completed.");
    error.status = response.status;
    error.fields = data?.errors ?? data;
    throw error;
  }
  return data;
}

function queryString(values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => value !== "" && value != null && query.set(key, value));
  return query.toString();
}

export function DepartmentsWorkspace() {
  const { user } = useAuth();
  const [tab, setTab] = useState("departments");
  const [notice, setNotice] = useState("");

  if (!hasRole(user, ...READ_ROLES)) return <ErrorBox message="You do not have access to the service catalog." />;

  return <div className="operations-section">
    <div className="mb-7 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:px-7">
      <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Hospital service catalog</p>
      <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Departments & services</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Maintain clinical units, service availability, standard fees, and auditable fee changes.</p>
    </div>
    {notice && <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 /><AlertDescription className="text-emerald-800 dark:text-emerald-300">{notice}</AlertDescription></Alert>}
    <div className="mb-6 flex gap-2 rounded-xl border bg-white dark:bg-slate-900 p-1.5 shadow-sm" role="tablist">
      {[["departments", "Departments", Building2], ["services", "Services", Wrench]].map(([key, label, Icon]) => <Button key={key} role="tab" aria-selected={tab === key} variant={tab === key ? "default" : "ghost"} className={tab === key ? "bg-cyan-700 hover:bg-cyan-800" : "text-slate-600 dark:text-slate-300"} onClick={() => setTab(key)}><Icon />{label}</Button>)}
    </div>
    {tab === "departments" ? <DepartmentList user={user} notify={setNotice} openServices={() => setTab("services")} /> : <ServiceList user={user} notify={setNotice} />}
  </div>;
}

function DuplicateResolutionAlert({ title, message, matches, onOpenExisting, onDismiss }) {
  if (!matches?.length) return null;

  return <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><AlertCircle className="text-amber-700 dark:text-amber-300" /><AlertDescription><strong className="block text-amber-900 dark:text-amber-200">{title}</strong><p className="mt-1 text-sm">{message}</p><ul className="mt-2 space-y-2">{matches.slice(0, 5).map((match) => <li key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-2 dark:border-amber-700 dark:bg-slate-900/40"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">{match.name || match.code || match.title || "Existing record"}{match.code ? <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{match.code}</span> : null}</span>{onOpenExisting && <Button type="button" size="sm" variant="outline" onClick={() => onOpenExisting(match)}>Open</Button>}</li>)}</ul>{onDismiss && <button type="button" className="mt-3 text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100" onClick={onDismiss}>Keep editing</button>}</AlertDescription></Alert>;
}

function DepartmentList({ user, notify, openServices }) {
  const admin = hasRole(user, "administrator");
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [search, setSearch] = useState(""), [status, setStatus] = useState(""), [clinical, setClinical] = useState("");
  const [dialog, setDialog] = useState(null), [reload, setReload] = useState(0);
  const load = useCallback(async () => {
    void reload;
    setLoading(true); setError("");
    try { setItems(rows(await catalogApi(`departments/?${queryString({ search, is_active: status, is_clinical: clinical, ordering: "name", page_size: 100 })}`))); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, [search, status, clinical, reload]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

  const active = items.filter((x) => x.is_active).length;
  const services = items.reduce((sum, x) => sum + Number(x.active_service_count || 0), 0);
  return <>
    <Stats values={[[Building2, "Visible departments", items.length], [Activity, "Active departments", active], [Stethoscope, "Clinical units", items.filter((x) => x.is_clinical).length], [Wrench, "Active services", services]]} />
    <ListToolbar title="Department directory" subtitle="Operational units and their service coverage" search={search} setSearch={setSearch} refreshing={loading} refresh={() => setReload((x) => x + 1)} action={admin ? () => setDialog({ type: "form" }) : null} actionLabel="New department">
      <Select value={status} onChange={setStatus} options={[["true", "Active"], ["false", "Inactive"]]} placeholder="All statuses" />
      <Select value={clinical} onChange={setClinical} options={[["true", "Clinical"], ["false", "Non-clinical"]]} placeholder="All types" />
    </ListToolbar>
    {error ? <ErrorBox message={error} retry={load} /> : <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-5 py-3.5">Department</th><th className="px-5 py-3.5">Type</th><th className="px-5 py-3.5">Services</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Deactivation readiness</th><th className="w-14" /></tr></thead><tbody className="divide-y">{loading ? <LoadingRows cols={6} /> : !items.length ? <EmptyRow cols={6} text="No departments match these filters." /> : items.map((item) => <tr key={item.id} className="hover:bg-cyan-50/30"><td className="px-5 py-4"><strong className="block text-slate-900 dark:text-slate-100">{item.name}</strong><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.code}</span>{item.description && <p className="mt-1 max-w-sm truncate text-xs text-slate-500 dark:text-slate-400">{item.description}</p>}</td><td className="px-5 py-4"><Badge variant="outline">{item.is_clinical ? "Clinical" : "Non-clinical"}</Badge></td><td className="px-5 py-4"><button className="font-semibold text-cyan-700 dark:text-cyan-300 hover:underline" onClick={openServices}>{item.active_service_count} active</button><span className="text-slate-400 dark:text-slate-500"> / {item.service_count} total</span></td><td className="px-5 py-4"><StatusBadge active={item.is_active} /></td><td className="px-5 py-4">{item.can_be_deactivated ? <span className="text-emerald-700 dark:text-emerald-300">Ready</span> : <span className="text-amber-700 dark:text-amber-300" title={(item.deactivation_blockers || []).join(", ")}>{(item.deactivation_blockers || []).join(", ")}</span>}</td><td className="px-3"><Actions>{admin && <><DropdownMenuItem onClick={() => setDialog({ type: "form", item })}><Pencil />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDialog({ type: "lifecycle", item })}>{item.is_active ? <Archive /> : <Activity />}{item.is_active ? "Deactivate" : "Activate"}</DropdownMenuItem></>}</Actions></td></tr>)}</tbody></table></div></Card>}
    {dialog?.type === "form" && <DepartmentForm item={dialog.item} onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); notify(message); setReload((x) => x + 1); }} onOpenDuplicate={(record) => setDialog({ type: "form", item: record })} />}
    {dialog?.type === "lifecycle" && <DepartmentLifecycle item={dialog.item} onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); notify(message); setReload((x) => x + 1); }} />}
  </>;
}

function ServiceList({ user, notify }) {
  const canEdit = hasRole(user, "administrator"), canLifecycle = hasRole(user, "administrator", "manager");
  const [items, setItems] = useState([]), [departments, setDepartments] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [search, setSearch] = useState(""), [department, setDepartment] = useState(""), [status, setStatus] = useState(""), [kind, setKind] = useState("");
  const [dialog, setDialog] = useState(null), [reload, setReload] = useState(0);
  const load = useCallback(async () => { void reload; setLoading(true); setError(""); try { const [serviceData, departmentData] = await Promise.all([catalogApi(`services/?${queryString({ search, department, is_active: status, is_laboratory: kind, ordering: "name", page_size: 100 })}`), catalogApi("departments/?ordering=name&page_size=100")]); setItems(rows(serviceData)); setDepartments(rows(departmentData)); } catch (reason) { setError(reason.message); } finally { setLoading(false); } }, [search, department, status, kind, reload]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const available = items.filter((x) => x.is_available).length;
  return <>
    <Stats values={[[Wrench, "Visible services", items.length], [CheckCircle2, "Available now", available], [FlaskConical, "Laboratory services", items.filter((x) => x.is_laboratory).length], [CircleDollarSign, "Discountable", items.filter((x) => x.is_discountable).length]]} />
    <ListToolbar title="Service catalog" subtitle="Fees, classification, and operational availability" search={search} setSearch={setSearch} refreshing={loading} refresh={() => setReload((x) => x + 1)} action={canEdit ? () => setDialog({ type: "form" }) : null} actionLabel="New service">
      <Select value={department} onChange={setDepartment} options={departments.map((x) => [x.id, x.name])} placeholder="All departments" />
      <Select value={status} onChange={setStatus} options={[["true", "Active"], ["false", "Inactive"]]} placeholder="All statuses" />
      <Select value={kind} onChange={setKind} options={[["true", "Laboratory"], ["false", "General"]]} placeholder="All types" />
    </ListToolbar>
    {error ? <ErrorBox message={error} retry={load} /> : <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"><tr><th className="px-5 py-3.5">Service</th><th className="px-5 py-3.5">Department</th><th className="px-5 py-3.5">Standard fee</th><th className="px-5 py-3.5">Classification</th><th className="px-5 py-3.5">Availability</th><th className="w-14" /></tr></thead><tbody className="divide-y">{loading ? <LoadingRows cols={6} /> : !items.length ? <EmptyRow cols={6} text="No services match these filters." /> : items.map((item) => <tr key={item.id} className="hover:bg-cyan-50/30"><td className="px-5 py-4"><strong className="block text-slate-900 dark:text-slate-100">{item.name}</strong><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.code}</span></td><td className="px-5 py-4 text-slate-700 dark:text-slate-300">{item.department_name}</td><td className="px-5 py-4 font-semibold tabular-nums">AFN {money(item.standard_fee)}</td><td className="px-5 py-4"><div className="flex gap-1.5"><Badge variant="outline">{item.is_laboratory ? "Laboratory" : "General"}</Badge>{item.is_discountable && <Badge className="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">Discountable</Badge>}</div></td><td className="px-5 py-4"><StatusBadge active={item.is_available} activeText="Available" inactiveText={item.is_active ? "Unavailable" : "Inactive"} /></td><td className="px-3"><Actions><DropdownMenuItem onClick={() => setDialog({ type: "history", item })}><History />Fee history</DropdownMenuItem>{canEdit && <DropdownMenuItem onClick={() => setDialog({ type: "form", item })}><Pencil />Edit</DropdownMenuItem>}{canLifecycle && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setDialog({ type: "serviceLifecycle", item })}>{item.is_active ? <Archive /> : <Activity />}{item.is_active ? "Deactivate" : "Activate"}</DropdownMenuItem></>}</Actions></td></tr>)}</tbody></table></div></Card>}
    {dialog?.type === "form" && <ServiceForm item={dialog.item} departments={departments} onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); notify(message); setReload((x) => x + 1); }} onOpenDuplicate={(record) => setDialog({ type: "form", item: record })} />}
    {dialog?.type === "history" && <FeeHistory item={dialog.item} onClose={() => setDialog(null)} />}
    {dialog?.type === "serviceLifecycle" && <ConfirmLifecycle item={dialog.item} resource="services" onClose={() => setDialog(null)} onSaved={(message) => { setDialog(null); notify(message); setReload((x) => x + 1); }} />}
  </>;
}

function DepartmentForm({ item, onClose, onSaved, onOpenDuplicate }) {
  const [form, setForm] = useState({ code: item?.code || "", name: item?.name || "", description: item?.description || "", is_clinical: item?.is_clinical ?? true });
  const [saving, setSaving] = useState(false), [error, setError] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null); setDuplicateMatches([]);
    try {
      await catalogApi(item ? `departments/${item.id}/` : "departments/", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      onSaved(`Department ${item ? "updated" : "created"} successfully.`);
    } catch (reason) {
      setError(reason);
      const searchValue = (form.name || form.code || "").trim();
      if (searchValue) {
        try {
          const result = await catalogApi(`departments/?search=${encodeURIComponent(searchValue)}&page_size=20`);
          const matches = rows(result).filter((entry) => !item || entry.id !== item.id).filter((entry) => [entry.name, entry.code].some((field) => field && field.localeCompare(searchValue, undefined, { sensitivity: "base" }) === 0));
          setDuplicateMatches(matches);
        } catch {
          setDuplicateMatches([]);
        }
      }
      setSaving(false);
    }
  }
  return <Modal title={item ? "Edit department" : "New department"} subtitle="Define the operational unit and its clinical classification." onClose={onClose}><form onSubmit={submit} className="space-y-4">{error && <FormError error={error} />}<DuplicateResolutionAlert title="Possible duplicate department found" message="This department matches an existing master record. Review the current entry before creating another duplicate." matches={duplicateMatches} onOpenExisting={onOpenDuplicate} onDismiss={() => setDuplicateMatches([])} /> <div className="grid gap-4 sm:grid-cols-2"><Field label="Department code"><Input autoFocus required maxLength={20} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field><Field label="Department name"><Input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div><Field label="Description"><Textarea rows={3} className="min-h-24" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><CheckField compact checked={form.is_clinical} onChange={(value) => setForm({ ...form, is_clinical: value })} title="Clinical department" text="This department provides patient-facing clinical care." /><FormActions sticky saving={saving} onClose={onClose} submitLabel={item ? "Save changes" : "Create department"} /></form></Modal>;
}

function ServiceForm({ item, departments, onClose, onSaved, onOpenDuplicate }) {
  const [form, setForm] = useState({ department: item?.department || "", code: item?.code || "", name: item?.name || "", standard_fee: item?.standard_fee || "0.00", is_laboratory: item?.is_laboratory ?? false, is_discountable: item?.is_discountable ?? true, fee_change_reason: "" });
  const [saving, setSaving] = useState(false), [error, setError] = useState(null), [duplicateMatches, setDuplicateMatches] = useState([]);
  const feeChanged = item && Number(form.standard_fee) !== Number(item.standard_fee);
  async function submit(event) { event.preventDefault(); setSaving(true); setError(null); setDuplicateMatches([]); const payload = { ...form }; if (!feeChanged) delete payload.fee_change_reason; try { await catalogApi(item ? `services/${item.id}/` : "services/", { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); onSaved(`Service ${item ? "updated" : "created"} successfully.`); } catch (reason) { setError(reason); const searchValue = (form.name || form.code || "").trim(); if (searchValue) { try { const result = await catalogApi(`services/?search=${encodeURIComponent(searchValue)}&page_size=20`); const matches = rows(result).filter((entry) => !item || entry.id !== item.id).filter((entry) => [entry.name, entry.code].some((field) => field && field.localeCompare(searchValue, undefined, { sensitivity: "base" }) === 0)); setDuplicateMatches(matches); } catch { setDuplicateMatches([]); } } setSaving(false); } }
  return <Modal title={item ? "Edit service" : "New service"} subtitle="Configure billing and service availability rules." onClose={onClose}><form onSubmit={submit} className="space-y-5">{error && <FormError error={error} />}<DuplicateResolutionAlert title="Possible duplicate service found" message="This service matches an existing catalog entry. Consider using the existing service instead of creating a duplicate." matches={duplicateMatches} onOpenExisting={onOpenDuplicate} onDismiss={() => setDuplicateMatches([])} /><Field label="Department"><Select required value={form.department} onChange={(value) => setForm({ ...form, department: value })} options={departments.filter((x) => x.is_active || x.id === item?.department).map((x) => [x.id, `${x.name}${x.is_active ? "" : " (inactive)"}`])} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Service code"><Input required maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field><Field label="Service name"><Input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div><Field label="Standard fee (AFN)"><Input required type="number" min="0" step="0.01" value={form.standard_fee} onChange={(e) => setForm({ ...form, standard_fee: e.target.value })} /></Field>{feeChanged && <Field label="Fee change reason"><Input required maxLength={255} value={form.fee_change_reason} onChange={(e) => setForm({ ...form, fee_change_reason: e.target.value })} placeholder="Explain why the standard fee changed" /></Field>}<div className="grid gap-3 sm:grid-cols-2"><CheckField checked={form.is_laboratory} onChange={(value) => setForm({ ...form, is_laboratory: value })} title="Laboratory service" text="This service is fulfilled through the laboratory." /><CheckField checked={form.is_discountable} onChange={(value) => setForm({ ...form, is_discountable: value })} title="Discountable" text="Authorized discounts may be applied." /></div><FormActions saving={saving} onClose={onClose} /></form></Modal>;
}

function DepartmentLifecycle({ item, onClose, onSaved }) {
  const [cascade, setCascade] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(null);
  async function confirm() { setSaving(true); setError(null); try { await catalogApi(`departments/${item.id}/${item.is_active ? "deactivate" : "activate"}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.is_active ? { deactivate_services: cascade } : {}) }); onSaved(`${item.name} ${item.is_active ? "deactivated" : "activated"}.`); } catch (reason) { setError(reason); setSaving(false); } }
  return <Modal title={`${item.is_active ? "Deactivate" : "Activate"} department`} subtitle={item.name} onClose={onClose}>{error && <FormError error={error} />}<p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.is_active ? "Deactivation removes this department and its services from active operations. Existing historical records remain intact." : "Activation makes this department available for operational use again."}</p>{item.is_active && item.has_active_services && <div className="mt-4"><CheckField checked={cascade} onChange={setCascade} title={`Also deactivate ${item.active_service_count} active services`} text="Required when the department still has active services." /></div>}{item.is_active && item.deactivation_blockers?.length > 0 && <Alert className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40"><AlertCircle /><AlertDescription className="text-amber-900 dark:text-amber-300">Current blockers: {item.deactivation_blockers.join(", ")}.</AlertDescription></Alert>}<FormActions saving={saving} onClose={onClose} onSubmit={confirm} submitLabel={item.is_active ? "Deactivate" : "Activate"} destructive={item.is_active} /></Modal>;
}

function ConfirmLifecycle({ item, resource, onClose, onSaved }) {
  const [saving, setSaving] = useState(false), [error, setError] = useState(null);
  async function confirm() { setSaving(true); setError(null); try { await catalogApi(`${resource}/${item.id}/${item.is_active ? "deactivate" : "activate"}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); onSaved(`${item.name} ${item.is_active ? "deactivated" : "activated"}.`); } catch (reason) { setError(reason); setSaving(false); } }
  return <Modal title={`${item.is_active ? "Deactivate" : "Activate"} service`} subtitle={`${item.name} · ${item.department_name}`} onClose={onClose}>{error && <FormError error={error} />}<p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.is_active ? "The service will no longer be available for new operational activity. Historical records are preserved." : "The service will become active, provided its department and laboratory configuration allow it."}</p><FormActions saving={saving} onClose={onClose} onSubmit={confirm} submitLabel={item.is_active ? "Deactivate" : "Activate"} destructive={item.is_active} /></Modal>;
}

function FeeHistory({ item, onClose }) {
  const [data, setData] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { catalogApi(`services/${item.id}/fee-history/?page_size=100`).then((result) => setData(rows(result))).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, [item.id]);
  return <Modal title="Fee history" subtitle={`${item.name} · ${item.code}`} onClose={onClose}>{error ? <ErrorBox message={error} /> : loading ? <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading fee history…</div> : !data.length ? <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No fee history is available.</p> : <div className="relative ml-2 border-l border-slate-200 dark:border-slate-700 pl-6">{data.map((entry) => <div key={entry.id} className="relative mb-6 last:mb-0"><span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white dark:border-slate-700 bg-cyan-600 ring-1 ring-cyan-200" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900 dark:text-slate-100">AFN {money(entry.new_fee)}</p><p className="text-xs text-slate-500 dark:text-slate-400">from {entry.previous_fee == null ? "initial setup" : `AFN ${money(entry.previous_fee)}`}</p></div><time className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.changed_at, true)}</time></div><p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{entry.reason}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Changed by {entry.changed_by_name || "System"}</p></div>)}</div>}</Modal>;
}

function Stats({ values }) { return <div className="mb-5 grid overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm sm:grid-cols-2 xl:grid-cols-4">{values.map(([Icon, label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r xl:border-b-0"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"><Icon className="size-5" /></span><div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-0.5 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</p></div></div></div>)}</div>; }
function ListToolbar({ title, subtitle, search, setSearch, refreshing, refresh, action, actionLabel, children }) { return <div className="mb-4 rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-sm"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><h2 className="font-semibold text-slate-950 dark:text-slate-50">{title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p></div><div className="flex flex-wrap gap-2">{action && <Button onClick={action} className="bg-cyan-700 hover:bg-cyan-800"><Plus />{actionLabel}</Button>}<Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh"><RefreshCw className={refreshing ? "animate-spin" : ""} /></Button></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400 dark:text-slate-500" /><Input className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name" /></div>{children}</div></div>; }
function Actions({ children }) { return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open actions" title="Actions" className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900" />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 p-1.5">{children}</DropdownMenuContent></DropdownMenu>; }
function StatusBadge({ active, activeText = "Active", inactiveText = "Inactive" }) { return <Badge className={active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}>{active ? activeText : inactiveText}</Badge>; }
function CheckField({ checked, onChange, title, text, compact = false }) { return <label className={`flex cursor-pointer gap-3 rounded-xl border bg-slate-50/60 dark:bg-slate-900/60 ${compact ? "p-3.5" : "p-4"}`}><Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" /><span><strong className="block text-sm text-slate-800 dark:text-slate-200">{title}</strong><span className={`${compact ? "mt-0.5" : "mt-1"} block text-xs leading-5 text-slate-500 dark:text-slate-400`}>{text}</span></span></label>; }
function FormActions({ saving, onClose, onSubmit, submitLabel = "Save changes", destructive = false, sticky = false }) { return <div className={`flex justify-end gap-3 border-t pt-4 ${sticky ? "sticky -bottom-5 z-10 -mx-5 -mb-5 border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-5 pb-5 backdrop-blur md:-bottom-6 md:-mx-6 md:-mb-6 md:px-6 md:pb-6" : ""}`}><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type={onSubmit ? "button" : "submit"} variant={destructive ? "destructive" : "default"} disabled={saving} onClick={onSubmit}>{saving ? <LoaderCircle className="animate-spin" /> : destructive ? <Archive /> : <CheckCircle2 />}{submitLabel}</Button></div>; }
function LoadingRows({ cols }) { return Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={cols} className="px-5 py-4"><div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></td></tr>); }
function EmptyRow({ cols, text }) { return <tr><td colSpan={cols} className="px-5 py-14 text-center"><ToggleLeft className="mx-auto mb-2 size-8 text-slate-300" /><p className="text-sm text-slate-500 dark:text-slate-400">{text}</p></td></tr>; }
function ErrorBox({ message, retry }) { return <Alert variant="destructive"><AlertCircle /><AlertDescription className="flex items-center justify-between gap-3">{message}{retry && <Button size="sm" variant="outline" onClick={retry}>Retry</Button>}</AlertDescription></Alert>; }
function FormError({ error }) { const fields = error?.fields && typeof error.fields === "object" ? Object.entries(error.fields).flatMap(([field, value]) => (Array.isArray(value) ? value : [value]).map((message) => `${field === "detail" ? "" : `${field.replaceAll("_", " ")}: `}${message}`)) : []; return <Alert variant="destructive"><AlertCircle /><AlertDescription><strong>We couldn&apos;t save this record.</strong><ul className="mt-1 list-disc pl-5">{(fields.length ? fields : [error.message]).map((message, index) => <li key={index}>{message}</li>)}</ul></AlertDescription></Alert>; }
