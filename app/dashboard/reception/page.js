"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  AlertCircle, 
  Banknote, 
  CheckCircle2, 
  Clock3, 
  CreditCard, 
  Eye, 
  ListFilter, 
  LoaderCircle, 
  Plus, 
  Printer, 
  RefreshCw, 
  Search, 
  Stethoscope, 
  UsersRound, 
  X 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-context";
import { hasRole, withSectionRole } from "@/lib/roles";
import { Field, Modal, Select, Textarea } from "@/components/pharmacy-ui";

const statusLabel = { 
  registered: "Registered", 
  in_progress: "In progress", 
  completed: "Completed", 
  cancelled: "Cancelled" 
};

const paymentLabel = { 
  unpaid: "Unpaid", 
  partially_paid: "Partially paid", 
  paid: "Paid", 
  refunded: "Refunded" 
};

const queueLabel = { 
  waiting: "Waiting", 
  called: "Called", 
  serving: "Serving", 
  finished: "Finished", 
  skipped: "Skipped", 
  cancelled: "Cancelled" 
};

export default function ReceptionPage() {
  const { user: account } = useAuth();
  const user = withSectionRole(account, "reception");
  const [visits, setVisits] = useState([]);
  const [queue, setQueue] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ 
    date: "", 
    status: "", 
    payment_status: "", 
    department: "" 
  });
  const [pagination, setPagination] = useState({ 
    count: 0, 
    next: false, 
    previous: false 
  });
  const [page, setPage] = useState(1);
  const [registering, setRegistering] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    
    const params = new URLSearchParams({ 
      page: String(page), 
      ordering: "-visit_date" 
    });
    
    if (query.trim()) {
      params.set("search", query.trim());
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    
    const queueParams = new URLSearchParams({ 
      date: filters.date || today() 
    });
    
    if (filters.department) {
      queueParams.set("department", filters.department);
    }
    
    try {
      const [visitResponse, queueResponse, departmentResponse] = await Promise.all([
        fetch(`/api/reception/receptions?${params}`),
        fetch(`/api/reception/receptions/queue?${queueParams}`),
        fetch("/api/reception/departments?is_active=true&ordering=name"),
      ]);
      
      const visitData = await visitResponse.json();
      const queueData = await queueResponse.json();
      const departmentData = await departmentResponse.json();
      
      if (!visitResponse.ok) {
        throw new Error(visitData.message || "Unable to load reception visits.");
      }
      
      setVisits(visitData.results || visitData);
      setPagination({ 
        count: visitData.count ?? visitData.length, 
        next: Boolean(visitData.next), 
        previous: Boolean(visitData.previous) 
      });
      
      if (queueResponse.ok) {
        setQueue(queueData.results || queueData);
      }
      
      if (departmentResponse.ok) {
        setDepartments(departmentData.results || departmentData);
      }
    } catch (reason) { 
      setError(reason.message); 
    } finally { 
      setLoading(false); 
    }
  }, [filters, page, query]);
  
  useEffect(() => { 
    // Loading remote reception state is the purpose of this synchronization effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); 
  }, [load]);

  const totals = useMemo(() => ({
    waiting: queue.filter((item) => ["waiting", "called"].includes(item.status)).length,
    serving: queue.filter((item) => item.status === "serving").length,
    collected: visits.reduce((sum, visit) => sum + Number(visit.paid_amount || 0), 0),
  }), [queue, visits]);

  if (!hasRole(user, "administrator", "reception", "manager")) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>You do not have access to reception operations.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="operations-section">
      <div className="mb-7 flex flex-col justify-between gap-5 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:px-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Front desk operations</p>
          <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Reception</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Register visits, coordinate the live queue, and collect payments.
          </p>
        </div>
        {hasRole(user, "administrator", "reception", "manager") && (
          <Button 
            className="bg-cyan-700 hover:bg-cyan-800" 
            onClick={() => setRegistering(true)}
          >
            <Plus /> New visit
          </Button>
        )}
      </div>
      
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle />
          <AlertDescription className="flex items-center justify-between gap-3">
            {error}
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}
      
      {notice && (
        <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">{notice}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Visits shown" value={pagination.count} icon={UsersRound} />
        <Summary label="Waiting in queue" value={totals.waiting} icon={Clock3} tone="amber" />
        <Summary label="Now serving" value={totals.serving} icon={Stethoscope} tone="blue" />
        <Summary label="Collected (AFN)" value={money(totals.collected)} icon={Banknote} tone="emerald" />
      </div>

      <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Patient visits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination.count} record{pagination.count === 1 ? "" : "s"} for the selected day
          </p>
        </div>
      </div>
      
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
          <div className="flex flex-wrap gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4">
            <form 
              className="relative min-w-[220px] flex-[2_1_280px]" 
              onSubmit={(e) => { 
                e.preventDefault(); 
                setPage(1); 
                load(); 
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="Visit no., patient or MRN…" 
                value={query} 
                onChange={(e) => { 
                  setQuery(e.target.value); 
                  setPage(1); 
                }} 
              />
            </form>
            <Select 
              className="min-w-[140px] flex-1 basis-[140px]"
              value={filters.status} 
              onChange={(value) => updateFilter(setFilters, "status", value, setPage)} 
              placeholder="Any status" 
              options={Object.entries(statusLabel)} 
            />
            <Select 
              className="min-w-[150px] flex-1 basis-[150px]"
              value={filters.payment_status} 
              onChange={(value) => updateFilter(setFilters, "payment_status", value, setPage)} 
              placeholder="Any payment" 
              options={Object.entries(paymentLabel)} 
            />
            <Select 
              className="min-w-[165px] flex-1 basis-[165px]"
              value={filters.department} 
              onChange={(value) => updateFilter(setFilters, "department", value, setPage)} 
              placeholder="All departments" 
              options={departments.map((d) => [d.id, d.name])} 
            />
            <div className="min-w-[145px] flex-1 basis-[145px]">
              <label className="sr-only" htmlFor="visit-date">Visit date</label>
              <DatePicker
                id="visit-date"
                value={filters.date}
                onChange={(value) => updateFilter(setFilters, "date", value, setPage)}
                aria-label="Visit date"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={load} 
              aria-label="Refresh"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="operations-table reception-table w-full min-w-[760px] table-fixed text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="w-[22%] px-4 py-3.5">Patient / visit</th>
                  <th className="w-[17%] px-4 py-3.5">Department</th>
                  <th className="w-[13%] px-4 py-3.5">Queue</th>
                  <th className="w-[19%] px-4 py-3.5">Payment</th>
                  <th className="w-[13%] px-4 py-3.5">Status</th>
                  <th className="w-[10%] px-4 py-3.5">Time</th>
                  <th className="w-[6%] px-3 py-3.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-muted-foreground">
                      <LoaderCircle className="mx-auto mb-2 animate-spin" />
                      Loading visits…
                    </td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-muted-foreground">
                      No visits match these filters.
                    </td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id} className="border-t hover:bg-slate-50/70 dark:bg-slate-900/70">
                      <td className="px-4 py-4">
                        <p className="font-semibold">{visit.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{visit.visit_number}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{visit.department_name}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {visit.visit_type?.replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {visit.queue_entry ? (
                          <span className="font-medium text-cyan-700 dark:text-cyan-300">
                            #{visit.queue_entry.token_number} · {queueLabel[visit.queue_entry.status]}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">
                          AFN {money(visit.paid_amount)} / {money(visit.net_amount)}
                        </p>
                        <PaymentBadge status={visit.payment_status} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={visit.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {formatTime(visit.visit_date)}
                      </td>
                      <td className="px-3 py-4">
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => setSelected(visit)} 
                          aria-label={`Open ${visit.visit_number}`}
                        >
                          <Eye />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm sm:flex-row">
            <span className="text-muted-foreground">
              {pagination.count} visit{pagination.count === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!pagination.previous || loading} 
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-2 text-xs text-muted-foreground">
                Page {page}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!pagination.next || loading} 
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
        
        <QueuePanel 
          queue={queue} 
          onOpen={(item) => { 
            const visit = visits.find((v) => v.id === item.visit); 
            if (visit) setSelected(visit); 
          }} 
        />
      </div>
      
      {registering && (
        <VisitDialog 
          departments={departments} 
          onClose={() => setRegistering(false)} 
          onSaved={(visit) => { 
            setRegistering(false); 
            setNotice(`${visit.visit_number} registered successfully.`); 
            load(); 
          }} 
        />
      )}
      
      {selected && (
        <VisitDetail 
          visit={selected} 
          user={user} 
          onClose={() => setSelected(null)} 
          onChanged={(updated, message) => { 
            setSelected(updated); 
            setNotice(message); 
            load(); 
          }} 
        />
      )}
    </div>
  );
}

function QueuePanel({ queue, onOpen }) {
  return (
    <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-5">
        <div className="flex items-center gap-2">
          <ListFilter className="size-4 text-cyan-700 dark:text-cyan-300" />
          <h2 className="font-semibold">Today&apos;s queue</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Live patient flow across departments
        </p>
      </div>
      <div className="max-h-[620px] overflow-y-auto p-3">
        {queue.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            The queue is empty.
          </p>
        ) : (
          queue.map((item) => (
            <button
              key={item.id}
              onClick={() => onOpen(item)}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-cyan-600/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-sm font-bold text-cyan-700 dark:text-cyan-300">
                {item.token_number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {item.patient_name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.department_name}
                </span>
              </span>
              <Badge 
                variant="secondary" 
                className={queueTone(item.status)}
              >
                {queueLabel[item.status]}
              </Badge>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

function VisitDialog({ departments, onClose, onSaved }) {
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [patientQuery, setPatientQuery] = useState("");
  
  const [form, setForm] = useState({ 
    patient: "", 
    department: "", 
    provider: "", 
    visit_type: "outpatient", 
    room: "", 
    referral_source: "", 
    notes: "", 
    discount_amount: "0", 
    discount_reason: "", 
    paid_amount: "0", 
    initial_payment_method: "cash", 
    initial_payment_reference: "", 
    queue_priority: "0" 
  });
  
  const [lines, setLines] = useState([{ service: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  
  useEffect(() => { 
    const timer = setTimeout(async () => { 
      const r = await fetch(`/api/reception/patients?is_active=true&search=${encodeURIComponent(patientQuery)}`); 
      if (r.ok) { 
        const d = await r.json(); 
        setPatients(d.results || d); 
      } 
    }, 250); 
    return () => clearTimeout(timer); 
  }, [patientQuery]);
  
  useEffect(() => { 
    if (!form.department) return; 
    
    Promise.all([
      fetch(`/api/reception/services?is_active=true&department=${form.department}&ordering=name`), 
      fetch(`/api/accounts/users?role=clinician&department=${form.department}&is_active=true&ordering=username`)
    ]).then(async ([s, p]) => { 
      if (s.ok) { 
        const d = await s.json(); 
        setServices((d.results || d).filter((item) => item.is_active)); 
      } 
      if (p.ok) { 
        const d = await p.json(); 
        setProviders(d.results || d); 
      } else {
        setProviders([]);
      }
    }); 
  }, [form.department]);
  
  const total = lines.reduce((sum, line) => { 
    const service = services.find((s) => s.id === line.service);
    return sum + Number(service?.standard_fee || 0) * Number(line.quantity || 0);
  }, 0);
  
  async function submit(e) { 
    e.preventDefault(); 
    setSaving(true); 
    setError(""); 
    
    const payload = { 
      ...form, 
      provider: form.provider || null, 
      visit_date: new Date().toISOString(), 
      discount_amount: form.discount_amount || "0", 
      paid_amount: form.paid_amount || "0", 
      queue_priority: Number(form.queue_priority), 
      service_lines: lines.map((line) => ({ 
        service: line.service, 
        quantity: Number(line.quantity) 
      })) 
    }; 
    
    try { 
      const response = await fetch("/api/reception/receptions", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      }); 
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Unable to register visit.");
      }
      
      onSaved(data);
    } catch (reason) { 
      setError(reason.message); 
    } finally { 
      setSaving(false); 
    } 
  }
  
  return (
    <Modal 
      title="Register a new visit" 
      subtitle="Patient, services, queue and payment are created together." 
      onClose={onClose} 
      wide
    >
      <form onSubmit={submit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5">
          <SectionTitle number="1" title="Patient and visit" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Patient">
              <SearchableSelect
                required
                value={form.patient}
                onChange={(patient) => setForm({ ...form, patient })}
                searchValue={patientQuery}
                onSearchChange={setPatientQuery}
                placeholder="Search name, MRN or phone"
                options={patients.map((p) => [p.id, `${p.full_name} · ${p.medical_record_number}`])}
              />
            </Field>
            
            <Field label="Department">
              <select
                required
                className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10"
                value={form.department} 
                onChange={(e) => { 
                  setForm({ ...form, department: e.target.value, provider: "" }); 
                  setLines([{ service: "", quantity: 1 }]); 
                }}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            
            <Field label="Visit type">
              <Select 
                value={form.visit_type} 
                onChange={(value) => setForm({ ...form, visit_type: value })} 
                placeholder="Select visit type"
                options={[
                  ["outpatient", "Outpatient"], 
                  ["emergency", "Emergency"], 
                  ["follow_up", "Follow-up"], 
                  ["inpatient", "Inpatient"]
                ]} 
              />
            </Field>
            
            <Field label="Provider (optional)">
              <select
                className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10"
                value={form.provider} 
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              >
                <option value="">Unassigned</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.username}
                  </option>
                ))}
              </select>
            </Field>
            
            <Field label="Room">
              <Input 
                value={form.room} 
                onChange={(e) => setForm({ ...form, room: e.target.value })} 
                placeholder="Optional" 
              />
            </Field>
            
            <Field label="Referral source">
              <Input 
                value={form.referral_source} 
                onChange={(e) => setForm({ ...form, referral_source: e.target.value })} 
                placeholder="Walk-in, clinic, doctor…" 
              />
            </Field>
          </div>
        </section>
        
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="p-4 pb-2 sm:px-5"><SectionTitle number="2" title="Services" /></div>
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              className="mr-4 sm:mr-5"
              onClick={() => setLines([...lines, { service: "", quantity: 1 }])}
            >
              <Plus /> Add service
            </Button>
          </div>
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/40 p-4 sm:p-5">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_90px_44px] items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-sm">
                <select 
                  required 
                  className="h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10" 
                  value={line.service} 
                  onChange={(e) => setLines(
                    lines.map((item, i) => 
                      i === index ? { ...item, service: e.target.value } : item
                    )
                  )}
                >
                  <option value="">Select service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · AFN {money(s.standard_fee)}
                    </option>
                  ))}
                </select>
                <Input 
                  required 
                  type="number" 
                  min="1" 
                  value={line.quantity} 
                  onChange={(e) => setLines(
                    lines.map((item, i) => 
                      i === index ? { ...item, quantity: e.target.value } : item
                    )
                  )} 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  disabled={lines.length === 1} 
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </section>
        
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:p-5">
          <SectionTitle number="3" title="Payment and queue" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={`Initial payment · Total AFN ${money(total)}`}>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                max={Math.max(0, total - Number(form.discount_amount || 0))} 
                value={form.paid_amount} 
                onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} 
              />
            </Field>
            
            <Field label="Payment method">
              <Select 
                value={form.initial_payment_method} 
                onChange={(value) => setForm({ ...form, initial_payment_method: value })} 
                placeholder="Select payment method"
                options={paymentMethods} 
              />
            </Field>
            
            <Field label="Reference">
              <Input 
                value={form.initial_payment_reference} 
                onChange={(e) => setForm({ ...form, initial_payment_reference: e.target.value })} 
                required={form.initial_payment_method !== "cash" && Number(form.paid_amount) > 0} 
              />
            </Field>
            
            <Field label="Discount">
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={form.discount_amount} 
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} 
              />
            </Field>
            
            <Field label="Discount reason">
              <Input 
                value={form.discount_reason} 
                onChange={(e) => setForm({ ...form, discount_reason: e.target.value })} 
                required={Number(form.discount_amount) > 0} 
              />
            </Field>
            
            <Field label="Queue priority">
              <Input 
                type="number" 
                min="0" 
                max="100" 
                value={form.queue_priority} 
                onChange={(e) => setForm({ ...form, queue_priority: e.target.value })} 
              />
            </Field>
          </div>
        </section>
        
        <div className="flex justify-end gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-cyan-700 hover:bg-cyan-800">
            {saving && <LoaderCircle className="animate-spin" />}
            Register visit
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VisitDetail({ visit, user, onClose, onChanged }) {
  const [mode, setMode] = useState("");
  const [amount, setAmount] = useState(String(visit.balance_due || ""));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  
  async function action(path, body = {}) { 
    setSaving(true); 
    setError(""); 
    
    try { 
      const response = await fetch(`/api/reception/receptions/${visit.id}/${path}`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      }); 
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "The visit could not be updated.");
      }
      
      const updated = path === "payments" 
        ? { 
            ...visit, 
            paid_amount: (Number(visit.paid_amount) + Number(data.amount)).toFixed(2), 
            balance_due: (Number(visit.balance_due) - Number(data.amount)).toFixed(2), 
            payment_status: Number(visit.balance_due) === Number(data.amount) ? "paid" : "partially_paid" 
          }
        : path === "queue-status" 
          ? { ...visit, queue_entry: data }
          : data;
      
      onChanged(
        updated, 
        path === "payments" 
          ? "Payment collected successfully." 
          : path === "queue-status" 
            ? "Queue status updated."
            : "Visit updated successfully."
      );
      
      setMode("");
    } catch (reason) { 
      setError(reason.message); 
    } finally { 
      setSaving(false); 
    } 
  }
  
  function printReceipt() { 
    window.open(`/receipt/${visit.id}`, "_blank", "noopener,noreferrer"); 
  }
  
  return (
    <Modal 
      title={visit.patient_name} 
      subtitle={`${visit.visit_number} · ${visit.department_name}`} 
      onClose={onClose} 
      wide
    >
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailStat label="Status" value={statusLabel[visit.status]} />
        <DetailStat 
          label="Queue token" 
          value={visit.queue_entry ? `#${visit.queue_entry.token_number}` : "—"} 
        />
        <DetailStat label="Net total" value={`AFN ${money(visit.net_amount)}`} />
        <DetailStat label="Balance due" value={`AFN ${money(visit.balance_due)}`} />
      </div>
      
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-5">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Visit details</h3>
          <dl className="space-y-2 text-sm">
            <Data 
              label="Visit type" 
              value={visit.visit_type?.replaceAll("_", " ")} 
            />
            <Data 
              label="Provider" 
              value={visit.provider_name || "Unassigned"} 
            />
            <Data label="Room" value={visit.room || "—"} />
            <Data label="Registered" value={formatDate(visit.visit_date)} />
            <Data label="Payment" value={paymentLabel[visit.payment_status]} />
          </dl>
        </section>
        
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Services</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            {visit.service_lines?.map((line) => (
              <div key={line.id} className="flex justify-between border-b p-3 text-sm last:border-0">
                <span>
                  {line.service_name} 
                  <span className="text-muted-foreground">× {line.quantity}</span>
                </span>
                <strong>AFN {money(line.line_total)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      {mode === "payment" && (
        <div className="mt-5 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/40 p-4 sm:p-5">
          <h3 className="mb-3 font-semibold">Collect payment</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Amount">
              <Input 
                type="number" 
                step="0.01" 
                min="0.01" 
                max={visit.balance_due} 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
            </Field>
            <Field label="Method">
              <Select 
                value={method} 
                onChange={setMethod} 
                placeholder="Select method"
                options={paymentMethods} 
              />
            </Field>
            <Field label="Reference">
              <Input 
                value={reference} 
                onChange={(e) => setReference(e.target.value)} 
                required={method !== "cash"} 
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMode("")}>
              Cancel
            </Button>
            <Button 
              disabled={saving} 
              onClick={() => action("payments", { amount, method, transaction_reference: reference })}
            >
              Confirm payment
            </Button>
          </div>
        </div>
      )}
      
      {mode === "cancel" && (
        <div className="mt-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
          <Label>Cancellation reason</Label>
          <Textarea
            className="mt-2"
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMode("")}>
              Back
            </Button>
            <Button 
              variant="destructive" 
              disabled={saving || reason.trim().length < 3} 
              onClick={() => action("cancel", { reason })}
            >
              Cancel visit
            </Button>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-5">
        <Button variant="outline" onClick={printReceipt}>
          <Printer /> Receipt
        </Button>
        
        {visit.queue_entry?.status === "waiting" && 
          hasRole(user, "administrator", "reception", "clinician") && (
            <Button 
              variant="outline" 
              className="border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200 dark:hover:bg-cyan-900/60"
              onClick={() => action("queue-status", { status: "called" })}
            >
              Call patient
            </Button>
          )}
        
        {visit.queue_entry?.status === "called" && 
          hasRole(user, "administrator", "reception", "clinician") && (
            <Button 
              variant="outline" 
              className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60"
              onClick={() => action("queue-status", { status: "serving" })}
            >
              Begin serving
            </Button>
          )}
        
        {visit.status === "registered" && 
          hasRole(user, "administrator", "manager", "clinician") && (
            <Button variant="outline" className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60" onClick={() => action("start")}>
              Start visit
            </Button>
          )}
        
        {["registered", "in_progress"].includes(visit.status) && 
          hasRole(user, "administrator", "manager", "clinician") && (
            <Button variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60" onClick={() => action("complete")}>
              Complete
            </Button>
          )}
        
        {Number(visit.balance_due) > 0 && 
          visit.status !== "cancelled" && 
          hasRole(user, "administrator", "reception", "finance") && (
            <Button className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={() => setMode("payment")}>
              <CreditCard /> Collect payment
            </Button>
          )}
        
        {visit.status !== "cancelled" && 
          hasRole(user, "administrator", "reception", "manager") && (
            <Button variant="destructive" onClick={() => setMode("cancel")}>
              Cancel visit
            </Button>
          )}
      </div>
    </Modal>
  );
}

const paymentMethods = [
  ["cash", "Cash"], 
  ["card", "Card"], 
  ["bank_transfer", "Bank transfer"], 
  ["mobile_money", "Mobile money"], 
  ["other", "Other"]
];

function SectionTitle({ number, title }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
      <span className="flex size-6 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-xs text-cyan-700 dark:text-cyan-300">
        {number}
      </span>
      {title}
    </h3>
  );
}

function Summary({ label, value, icon: Icon, tone = "cyan" }) {
  const colors = { 
    cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300", 
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", 
    blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", 
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" 
  };
  
  return (
    <Card className="border-slate-200 dark:border-slate-700 py-4 shadow-sm">
      <CardContent className="flex items-center gap-4 px-5">
        <span className={`flex size-11 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon />
        </span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Data({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right capitalize">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = { 
    registered: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300", 
    in_progress: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", 
    completed: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", 
    cancelled: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" 
  };
  
  return (
    <Badge variant="secondary" className={tone[status]}>
      {statusLabel[status]}
    </Badge>
  );
}

function PaymentBadge({ status }) {
  const tone = { 
    unpaid: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", 
    partially_paid: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300", 
    paid: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", 
    refunded: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" 
  };
  
  return (
    <Badge variant="secondary" className={`mt-1 ${tone[status]}`}>
      {paymentLabel[status]}
    </Badge>
  );
}

function queueTone(status) {
  return { 
    waiting: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", 
    called: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", 
    serving: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300", 
    finished: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" 
  }[status] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
}

function updateFilter(setFilters, key, value, setPage) {
  setFilters((filters) => ({ ...filters, [key]: value }));
  setPage(1);
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function money(value) {
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Number(value || 0));
}

function formatTime(value) {
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`;
  return value 
    ? new Intl.DateTimeFormat(locale, { 
        hour: "numeric", 
        minute: "2-digit" 
      }).format(new Date(value)) 
    : "—";
}

function formatDate(value) {
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`;
  return value 
    ? new Intl.DateTimeFormat(locale, { 
        dateStyle: "medium", 
        timeStyle: "short" 
      }).format(new Date(value)) 
    : "—";
}
