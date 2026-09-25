"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Activity, AlertCircle, ArrowUpRight, Ban, Beaker, CheckCircle2, 
  ClipboardList, Eye, FilePenLine, FlaskConical, LoaderCircle, Microscope, MoreHorizontal,
  Pencil, Plus, RefreshCw, Search, TestTubeDiagonal, Trash2, TriangleAlert 
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { 
  errorSummary, Field, formatDate, inputError, jsonRequest, 
  LAB_ROLES, LAB_WRITE_ROLES, labelize, labApi, Modal, 
  rows, Select, Textarea 
} from "@/components/laboratory-ui";
import { hasRole, withSectionRole } from "@/lib/roles";

// ============= CONSTANTS =============
const STATUSES = [
  ["ordered", "Ordered"], 
  ["collected", "Collected"], 
  ["in_progress", "In progress"], 
  ["completed", "Completed"], 
  ["cancelled", "Cancelled"]
];

const STATUS_TONES = { 
  ordered: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", 
  collected: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300", 
  in_progress: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", 
  completed: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", 
  cancelled: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" 
};

const nowLocal = () => { 
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); 
  return d.toISOString().slice(0, 16); 
};

// ============= MAIN PAGE COMPONENT =============
export default function LaboratoryPage() {
  const { user: account } = useAuth();
  const user = withSectionRole(account, "laboratory");
  const [tab, setTab] = useState("overview");
  const [notice, setNotice] = useState("");
  
  if (!hasRole(user, ...LAB_ROLES)) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>
          You do not have access to laboratory operations.
        </AlertDescription>
      </Alert>
    );
  }
  
  const receptionOnly = hasRole(user, "reception") && !hasRole(user, "administrator", "laboratory", "manager");
  const available = receptionOnly
    ? [
        ["overview", "Overview", Microscope],
        ["orders", "Lab orders", ClipboardList]
      ]
    : [
        ["overview", "Overview", Microscope],
        ["orders", "Lab orders", ClipboardList],
        ["tests", "Test catalog", FlaskConical]
      ];
  
  return (
    <div className="pharmacy-section laboratory-section">
      <div className="mb-7 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:px-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          Diagnostics and specimen operations
        </p>
        <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">
          Laboratory
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Manage test orders, specimen collection, results, abnormal findings, 
          and the test catalog in one audited workspace.
        </p>
      </div>
      
      {notice && (
        <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 />
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            {notice}
          </AlertDescription>
        </Alert>
      )}
      
      <div 
        className="mb-7 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-sm" 
        role="tablist" 
        aria-label="Laboratory sections"
      >
        {available.map(([key, label, Icon]) => (
          <Button 
            key={key} 
            role="tab" 
            aria-selected={tab === key}
            variant={tab === key ? "default" : "outline"}
            className={tab === key 
              ? "border-cyan-700 bg-cyan-700 shadow-sm hover:bg-cyan-800" 
              : "border-transparent bg-transparent text-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            }
            onClick={() => setTab(key)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>
      
      {tab === "overview" ? (
        <LaboratoryWorkbench user={user} go={setTab} />
      ) : tab === "orders" ? (
        <Orders user={user} notify={setNotice} />
      ) : (
        <Tests user={user} notify={setNotice} />
      )}
    </div>
  );
}

function useLoad(path, key = 0) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => { let live = true; labApi(path).then((data) => live && setState({ loading: false, data, error: "" })).catch((e) => live && setState({ loading: false, data: null, error: errorSummary(e) })); return () => { live = false; }; }, [path, key]);
  return state;
}

function LaboratoryWorkbench({ user, go }) {
  const [refresh, setRefresh] = useState(0);
  const state = useLoad("lab-orders/?ordering=-ordered_at&page_size=100", refresh);
  const orders = rows(state.data);
  const awaiting = orders.filter((order) => order.status === "ordered");
  const collected = orders.filter((order) => order.status === "collected");
  const processing = orders.filter((order) => order.status === "in_progress");
  const completed = orders.filter((order) => order.status === "completed");
  const openOrders = [...awaiting, ...collected, ...processing];
  const allItems = orders.flatMap((order) => (order.items || []).map((item) => ({ ...item, order })));
  const pendingResults = allItems.filter((item) => !item.resulted_at && !["ordered", "cancelled"].includes(item.order.status));
  const abnormal = allItems.filter((item) => item.is_abnormal && item.resulted_at);
  const resulted = allItems.filter((item) => item.resulted_at).length;
  const completion = allItems.length ? Math.round((resulted / allItems.length) * 100) : 0;
  const canProcess = hasRole(user, "administrator", "laboratory");
  if (state.error) return <ErrorBox message={state.error} retry={() => setRefresh((value) => value + 1)} />;
  return <div>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300"><Microscope className="size-4" /></span><span className="text-xs font-bold uppercase tracking-[.15em] text-cyan-700 dark:text-cyan-300">Diagnostic workbench</span></div><h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Today’s laboratory queue</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Follow specimens from collection through result reporting.</p></div><Button variant="outline" size="icon" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh workbench"><RefreshCw className={state.loading ? "animate-spin" : ""} /></Button></div>

    <div className="grid overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm md:grid-cols-4">
      <LabStage label="Collect" value={awaiting.length} detail="orders waiting" icon={TestTubeDiagonal} tone="blue" active={awaiting.length > 0} />
      <LabStage label="Receive" value={collected.length} detail="specimens ready" icon={Beaker} tone="violet" active={collected.length > 0} />
      <LabStage label="Analyze" value={processing.length} detail="orders on bench" icon={FlaskConical} tone="amber" active={processing.length > 0} />
      <LabStage label="Report" value={completed.length} detail="orders completed" icon={CheckCircle2} tone="emerald" />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="flex items-center justify-between gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">Specimen and result bench</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Open orders prioritized by the next laboratory action</p></div><Badge variant="secondary" className="bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">{openOrders.length} open</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50/70 dark:bg-slate-900/70 text-[10px] uppercase tracking-[.12em] text-slate-500 dark:text-slate-400"><tr><th className="px-5 py-3">Order / patient</th><th className="px-5 py-3">Specimen stage</th><th className="px-5 py-3">Test progress</th><th className="px-5 py-3">Next action</th></tr></thead><tbody>{state.loading ? <LoadingRow cols={4} /> : !openOrders.length ? <tr><td colSpan={4} className="py-14 text-center text-slate-500 dark:text-slate-400">No specimens are currently in the laboratory workflow.</td></tr> : openOrders.slice(0, 8).map((order) => { const total = order.items?.length || 0; const done = order.items?.filter((item) => item.resulted_at).length || 0; const next = order.status === "ordered" ? "Collect specimen" : order.status === "collected" ? "Start analysis" : done < total ? "Enter results" : "Complete report"; return <tr key={order.id} className="border-t transition hover:bg-cyan-50/40"><td className="px-5 py-4"><strong className="block text-slate-900 dark:text-slate-100">{order.order_number}</strong><small className="text-slate-500 dark:text-slate-400">{order.patient_name}</small></td><td className="px-5 py-4"><Status value={order.status} /></td><td className="px-5 py-4"><div className="mb-1.5 flex justify-between text-xs"><span>{done}/{total} resulted</span><span className="text-slate-400 dark:text-slate-500">{total ? Math.round(done / total * 100) : 0}%</span></div><div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${total ? done / total * 100 : 0}%` }} /></div></td><td className="px-5 py-4"><button type="button" onClick={() => go("orders")} className="inline-flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-300 hover:text-cyan-900">{next}<ArrowUpRight className="size-3.5" /></button></td></tr>; })}</tbody></table></div><div className="border-t bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 text-right"><Button size="sm" variant="ghost" className="text-cyan-700 dark:text-cyan-300" onClick={() => go("orders")}>Open full laboratory queue <ArrowUpRight /></Button></div></Card>

      <div className="space-y-5"><Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="border-b bg-red-50/60 dark:bg-red-950/40 px-5 py-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">Abnormal findings</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Flagged results requiring attention</p></div><span className="flex size-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"><TriangleAlert className="size-4" /></span></div></div><div className="divide-y">{state.loading ? <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading results…</div> : !abnormal.length ? <div className="px-5 py-10 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-500" /><p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">No abnormal results</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No flagged findings in the current data.</p></div> : abnormal.slice(0, 5).map((item) => <button type="button" key={item.id} onClick={() => go("orders")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-red-50/40"><span className="size-2 shrink-0 rounded-full bg-red-500" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{item.test_name}</strong><small className="block truncate text-slate-500 dark:text-slate-400">{item.order.patient_name} · {item.order.order_number}</small></span><span className="max-w-24 truncate text-xs font-semibold text-red-700 dark:text-red-300">{item.result}</span></button>)}</div></Card>

        <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="border-b px-5 py-4"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Bench summary</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Test-level workload</p></div><div className="grid grid-cols-2 divide-x"><div className="p-5"><p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{state.loading ? "—" : pendingResults.length}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Results pending</p></div><div className="p-5"><p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{state.loading ? "—" : `${completion}%`}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tests resulted</p></div></div><div className="border-t px-5 py-4"><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${completion}%` }} /></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{resulted} of {allItems.length} tests have a recorded result.</p></div></Card>
      </div>
    </div>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-100 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/40 px-5 py-4"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{canProcess ? "Ready to continue laboratory work?" : "Laboratory activity is available in read-only mode."}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{canProcess ? "Open an order to collect specimens, enter results, or complete reporting." : "Open the queue to review specimens and reported results."}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => go("orders")}><ClipboardList />Open orders</Button>{!hasRole(user, "reception") && <Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => go("tests")}><FlaskConical />Test catalog</Button>}</div></div>
  </div>;
}

function LabStage({ label, value, detail, icon: Icon, tone, active }) { const styles = { blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-100", violet: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-100", amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-100", emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-100" }; return <div className="relative border-b p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="flex items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${styles[tone]}`}><Icon className="size-5" /></span><div><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">{label}</p>{active && <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />}</div><p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p></div></div></div>; }

function LaboratoryOverview({ user, go }) {
  const [refresh, setRefresh] = useState(0);
  const state = useLoad("lab-orders/?ordering=-ordered_at&page_size=100", refresh);
  const orders = rows(state.data);
  const count = (status) => orders.filter((order) => order.status === status).length;
  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const totalTests = orders.reduce((sum, order) => sum + (order.items?.length || 0), 0);
  const resultedTests = orders.reduce((sum, order) => sum + (order.items?.filter((item) => item.resulted_at).length || 0), 0);
  const abnormalTests = orders.reduce((sum, order) => sum + (order.items?.filter((item) => item.is_abnormal).length || 0), 0);
  const completionRate = totalTests ? Math.round((resultedTests / totalTests) * 100) : 0;
  const pipeline = [["Awaiting collection", "ordered", "bg-blue-500"], ["Collected", "collected", "bg-violet-500"], ["In progress", "in_progress", "bg-amber-500"], ["Completed", "completed", "bg-emerald-500"]];
  const cards = [["Active orders", activeOrders.length, `${count("ordered")} awaiting collection`, ClipboardList, "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"], ["Tests resulted", resultedTests, `${completionRate}% completion rate`, CheckCircle2, "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"], ["In progress", count("in_progress"), `${count("collected")} specimens collected`, LoaderCircle, "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"], ["Abnormal findings", abnormalTests, abnormalTests ? "Require clinical attention" : "No flagged results", Activity, "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"]];
  if (state.error) return <ErrorBox message={state.error} retry={() => setRefresh((value) => value + 1)} />;
  return <div>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Laboratory overview</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live diagnostic workflow across the latest {orders.length} orders</p></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh overview"><RefreshCw className={state.loading ? "animate-spin" : ""} /></Button><Button variant="outline" onClick={() => go("orders")}>View all orders <ArrowUpRight /></Button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, caption, Icon, tone]) => <Card key={label} className="relative overflow-hidden p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{state.loading ? "—" : value}</p></div><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span></div><p className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">{state.loading ? "Loading laboratory data…" : caption}</p></Card>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><LabOverviewHeader title="Order pipeline" subtitle={`${activeOrders.length} orders currently active`} action="Open queue" onClick={() => go("orders")} /><div className="p-5"><div className="mb-5 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-950 p-5 text-white"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-100">Result completion</p><p className="mt-2 text-4xl font-semibold tracking-tight">{state.loading ? "—" : `${completionRate}%`}</p><p className="mt-1 text-xs text-cyan-100">{resultedTests} of {totalTests} ordered tests resulted</p></div><FlaskConical className="size-12 text-white/20" /></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-200 transition-all" style={{ width: `${completionRate}%` }} /></div></div><div className="space-y-4">{pipeline.map(([label, status, color]) => { const value = count(status); const percent = orders.length ? Math.round((value / orders.length) * 100) : 0; return <div key={status}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-300">{label}</span><span className="tabular-nums text-slate-500 dark:text-slate-400">{value} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div></div>; })}</div></div></Card>
      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><LabOverviewHeader title="Orders requiring action" subtitle="Unfinished work ordered by most recent" action="View queue" onClick={() => go("orders")} /><div className="divide-y divide-slate-100 dark:divide-slate-800">{state.loading ? <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading orders…</div> : !activeOrders.length ? <div className="px-5 py-16 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300"><CheckCircle2 /></span><p className="mt-3 font-medium text-slate-800 dark:text-slate-200">The queue is clear</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No laboratory orders currently require action.</p></div> : activeOrders.slice(0, 6).map((order) => { const done = order.items?.filter((item) => item.resulted_at).length || 0; const total = order.items?.length || 0; return <button key={order.id} type="button" onClick={() => go("orders")} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-cyan-50/50"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${order.status === "ordered" ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : order.status === "collected" ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"}`}>{order.status === "ordered" ? <TestTubeDiagonal className="size-4" /> : order.status === "collected" ? <Beaker className="size-4" /> : <LoaderCircle className="size-4" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{order.order_number} · {order.patient_name}</strong><small className="block truncate text-slate-500 dark:text-slate-400">{formatDate(order.ordered_at, true)} · {done}/{total} tests resulted</small></span><Status value={order.status} /></button>; })}</div></Card>
    </div>
    <Card className="mt-5 gap-0 overflow-hidden py-0 shadow-sm"><div className="border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Quick actions</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Move directly into common laboratory workflows</p></div><div className={`grid ${hasRole(user, "reception") ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}><LabQuickAction icon={ClipboardList} title="Manage orders" caption="Search and process the queue" onClick={() => go("orders")} tone="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" /><LabQuickAction icon={TestTubeDiagonal} title="Specimen queue" caption={`${count("ordered")} awaiting collection`} onClick={() => go("orders")} tone="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300" bordered />{!hasRole(user, "reception") && <LabQuickAction icon={FlaskConical} title="Test catalog" caption="Manage diagnostic tests" onClick={() => go("tests")} tone="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" bordered />}</div></Card>
    {!hasRole(user, "administrator", "laboratory", "clinician", "reception") && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Your role has read-only access.</p>}
  </div>;
}

function LabOverviewHeader({ title, subtitle, action, onClick }) { return <div className="flex items-center justify-between gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p></div><Button size="sm" variant="ghost" className="text-cyan-700 dark:text-cyan-300" onClick={onClick}>{action}<ArrowUpRight /></Button></div>; }
function LabQuickAction({ icon: Icon, title, caption, onClick, tone, bordered }) { return <button type="button" onClick={onClick} className={`group flex items-center gap-3 p-5 text-left transition hover:bg-cyan-50/60 ${bordered ? "border-t sm:border-l sm:border-t-0" : ""}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900 dark:text-slate-100">{title}</strong><small className="text-slate-500 dark:text-slate-400">{caption}</small></span><ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-cyan-600" /></button>; }

function Overview({ user, go }) {
  const [refresh, setRefresh] = useState(0);
  const state = useLoad("lab-orders/?ordering=-ordered_at&page_size=100", refresh);
  const orders = rows(state.data);
  const count = (status) => orders.filter((o) => o.status === status).length;
  const cards = [["Awaiting collection", count("ordered"), TestTubeDiagonal, "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"], ["Collected", count("collected"), Beaker, "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"], ["In progress", count("in_progress"), LoaderCircle, "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"], ["Completed", count("completed"), CheckCircle2, "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"]];
  if (state.error) return <ErrorBox message={state.error} retry={() => setRefresh((x) => x + 1)} />;
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, tone]) => <Card key={label} className="py-4"><CardContent className="flex items-center gap-4 px-5"><span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon /></span><div><p className="text-2xl font-semibold">{state.loading ? "—" : value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div></CardContent></Card>)}</div>
    <Card className="gap-0 overflow-hidden py-0"><div className="flex items-center justify-between border-b p-5"><div><h3 className="font-semibold">Recent orders</h3><p className="text-xs text-slate-500 dark:text-slate-400">Latest laboratory activity</p></div><Button variant="ghost" size="sm" onClick={() => go("orders")}>View all</Button></div><div className="divide-y p-3">{state.loading ? <p className="py-12 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading…</p> : orders.slice(0, 6).map((order) => <button key={order.id} onClick={() => go("orders")} className="flex w-full items-center justify-between gap-4 rounded-lg p-3 text-left hover:bg-cyan-50/50"><span><strong className="block text-sm">{order.order_number}</strong><small className="text-slate-500 dark:text-slate-400">{order.patient_name} · {formatDate(order.ordered_at, true)}</small></span><Status value={order.status} /></button>)}</div></Card>
    {!hasRole(user, "administrator", "laboratory", "clinician", "reception") && <p className="text-xs text-slate-500 dark:text-slate-400">Your role has read-only access.</p>}
  </div>;
}

function Orders({ user, notify }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0); const [dialog, setDialog] = useState(null); const [selected, setSelected] = useState(null);
  const path = useMemo(() => { const p = new URLSearchParams({ page: String(page), ordering: "-ordered_at" }); if (query.trim()) p.set("search", query.trim()); if (status) p.set("status", status); if (from) p.set("date_from", from); if (to) p.set("date_to", to); return `lab-orders/?${p}`; }, [query, status, from, to, page]);
  const state = useLoad(path, refresh); const orders = rows(state.data); const canCreate = hasRole(user, "administrator", "laboratory", "clinician", "reception");
  const saved = (message) => { setDialog(null); setSelected(null); notify(message); setRefresh((x) => x + 1); };
  return <div><ResourceHeader title="Lab orders" count={state.data?.count ?? orders.length} action={canCreate && <Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => setDialog("create")}><Plus />New order</Button>} />{state.error && <ErrorBox message={state.error} retry={() => setRefresh((x) => x + 1)} />}
    <Card className="gap-0 overflow-hidden py-0"><div className="flex flex-wrap gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 p-4"><SearchBox value={query} set={(v) => { setQuery(v); setPage(1); }} placeholder="Order number, patient, or medical record…" /><div className="min-w-44 flex-1 sm:max-w-52"><Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} placeholder="Any status" /></div><DatePicker value={from} onChange={setFrom} placeholder="From date" className="w-auto min-w-[140px]" /><DatePicker value={to} onChange={setTo} placeholder="To date" className="w-auto min-w-[140px]" /><Button variant="outline" size="icon" onClick={() => setRefresh((x) => x + 1)}><RefreshCw className={state.loading ? "animate-spin" : ""} /></Button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400"><tr>{["Order / patient", "Ordered", "Tests", "Progress", "Ordered by", "Status", ""].map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr></thead><tbody>{state.loading ? <LoadingRow cols={7} /> : !orders.length ? <EmptyRow cols={7} text="No laboratory orders match these filters." /> : orders.map((o) => <OrderRow key={o.id} order={o} user={user} open={(mode) => { setSelected(o); setDialog(mode); }} />)}</tbody></table></div><Pagination data={state.data} page={page} setPage={setPage} loading={state.loading} /></Card>
    {dialog === "create" && <OrderForm onClose={() => setDialog(null)} onSaved={() => saved("Laboratory order created.")} />}
    {dialog === "edit" && <OrderForm order={selected} onClose={() => setDialog(null)} onSaved={() => saved("Laboratory order updated.")} />}
    {dialog === "detail" && <OrderDetail initial={selected} user={user} onClose={() => setDialog(null)} onChanged={saved} />}
    {dialog === "cancel" && <CancelOrder order={selected} onClose={() => setDialog(null)} onSaved={() => saved("Laboratory order cancelled.")} />}
  </div>;
}

function OrderRow({ order, user, open }) {
  const done = order.items?.filter((x) => x.resulted_at).length || 0; const total = order.items?.length || 0;
  const canEdit = hasRole(user, "administrator", "laboratory", "clinician") && order.status === "ordered" && !done;
  const canCancel = hasRole(user, "administrator", "laboratory", "manager") && !["completed", "cancelled"].includes(order.status);
  return <tr className="border-t hover:bg-cyan-50/40"><td className="px-5 py-4"><strong className="block">{order.order_number}</strong><small className="text-slate-500 dark:text-slate-400">{order.patient_name}</small></td><td className="px-5 py-4">{formatDate(order.ordered_at, true)}</td><td className="px-5 py-4">{total}</td><td className="px-5 py-4">{done}/{total} resulted</td><td className="px-5 py-4">{order.ordered_by_name || "—"}</td><td className="px-5 py-4"><Status value={order.status} /></td><td className="px-5 py-4 text-right"><DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Order actions" title="Actions" className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900" />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 p-1.5"><DropdownMenuItem onClick={() => open("detail")}><Eye />View & process</DropdownMenuItem>{canEdit && <DropdownMenuItem onClick={() => open("edit")}><Pencil />Edit order</DropdownMenuItem>}{canCancel && <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => open("cancel")}><Ban />Cancel</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td></tr>;
}

function OrderForm({ order, onClose, onSaved }) {
  const [patients, setPatients] = useState([]); const [visits, setVisits] = useState([]); const [tests, setTests] = useState([]); const [patientSearch, setPatientSearch] = useState(""); const [form, setForm] = useState({ patient: order?.patient || "", visit: order?.visit || "", ordered_at: order?.ordered_at ? new Date(order.ordered_at).toISOString().slice(0, 16) : nowLocal(), clinical_notes: order?.clinical_notes || "", items: order?.items?.map((x) => x.test) || [] }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false);
  useEffect(() => { const timer = setTimeout(() => labApi(`patients/?is_active=true&search=${encodeURIComponent(patientSearch)}&ordering=first_name`).then((d) => setPatients(rows(d))).catch(() => {}), 200); return () => clearTimeout(timer); }, [patientSearch]);
  useEffect(() => { labApi("lab-tests/?is_active=true&ordering=name&page_size=200").then((d) => setTests(rows(d).filter((test) => test.is_active))).catch(() => {}); }, []);
  useEffect(() => { if (!form.patient) return; labApi(`receptions/?patient=${form.patient}&ordering=-date&page_size=50`).then((d) => setVisits(rows(d).filter((v) => !["completed", "cancelled"].includes(v.status)))).catch(() => setVisits([])); }, [form.patient]);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { const payload = { patient: form.patient, visit: form.visit || null, ordered_at: new Date(form.ordered_at).toISOString(), clinical_notes: form.clinical_notes }; if (!order) payload.items = form.items.map((test) => ({ test })); await jsonRequest(`lab-orders/${order ? `${order.id}/` : ""}`, payload, order ? "PATCH" : "POST"); onSaved(); } catch (reason) { setError(reason); } finally { setSaving(false); } }
  const toggle = (id) => setForm({ ...form, items: form.items.includes(id) ? form.items.filter((x) => x !== id) : [...form.items, id] });
  return <Modal title={order ? "Edit laboratory order" : "New laboratory order"} subtitle={order ? "Only unprocessed orders can be edited." : "Select the patient and all requested tests."} onClose={onClose} wide><form onSubmit={submit} className="space-y-6">{error && <FormError error={error} />}<div className="grid gap-4 sm:grid-cols-2"><Field label="Patient" error={inputError(error, "patient")}><SearchableSelect required disabled={Boolean(order)} value={form.patient} onChange={(patient) => setForm({ ...form, patient, visit: "" })} searchValue={patientSearch} onSearchChange={setPatientSearch} options={patients.map((p) => [p.id, `${p.full_name || `${p.first_name} ${p.last_name}`} · ${p.medical_record_number || "No MRN"}`])} placeholder="Search name, phone, or medical record…" /></Field><Field label="Active visit (optional)" error={inputError(error, "visit")}><Select disabled={Boolean(order)} value={form.visit} onChange={(visit) => setForm({ ...form, visit })} options={visits.map((v) => [v.id, `${v.visit_number} · ${formatDate(v.date || v.created_at, true)}`])} placeholder="No linked visit" /></Field><Field label="Ordered at" error={inputError(error, "ordered_at")}><Input required type="datetime-local" max={nowLocal()} value={form.ordered_at} onChange={(e) => setForm({ ...form, ordered_at: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="Clinical notes" error={inputError(error, "clinical_notes")}><Textarea value={form.clinical_notes} onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })} placeholder="Clinical context, symptoms, or special instructions…" /></Field></div></div>{!order && <section><div className="mb-3 flex items-end justify-between"><div><h3 className="font-semibold">Requested tests</h3><p className="text-xs text-slate-500 dark:text-slate-400">Choose one or more active tests.</p></div><Badge variant="secondary">{form.items.length} selected</Badge></div><div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 p-3 sm:grid-cols-2">{tests.map((test) => <label key={test.id} className="flex cursor-pointer gap-3 rounded-lg border bg-white dark:bg-slate-900 p-3 hover:border-cyan-300"><Checkbox checked={form.items.includes(test.id)} onCheckedChange={() => toggle(test.id)} /><span><strong className="block text-sm">{test.name}</strong><small className="text-slate-500 dark:text-slate-400">{test.code}{test.specimen_type ? ` · ${test.specimen_type}` : ""}</small></span></label>)}</div>{inputError(error, "items") && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">{inputError(error, "items")}</p>}</section>}<FormActions onClose={onClose} saving={saving} label={order ? "Save changes" : "Create order"} /></form></Modal>;
}

function OrderDetail({ initial, user, onClose, onChanged }) {
  const { t, language } = useLanguage();
  const [order, setOrder] = useState(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [resultItem, setResultItem] = useState(null); const [cancelOpen, setCancelOpen] = useState(false);
  const reload = useCallback(() => labApi(`lab-orders/${order.id}/`).then(setOrder).catch((e) => setError(errorSummary(e))), [order.id]);
  async function collect() { setBusy(true); setError(""); try { setOrder(await jsonRequest(`lab-orders/${order.id}/collect/`, {})); } catch (e) { setError(errorSummary(e)); } finally { setBusy(false); } }
  const canLab = hasRole(user, ...LAB_WRITE_ROLES); const canCancel = hasRole(user, "administrator", "laboratory", "manager") && !["completed", "cancelled"].includes(order.status);
  return <Modal title={order.order_number} subtitle={`${order.patient_name} · ${formatDate(order.ordered_at, true, language)}`} onClose={onClose} wide>{error && <ErrorBox message={error} retry={reload} />}<div className="grid gap-4 sm:grid-cols-3"><Info label="Status" value={<Status value={order.status} />} /><Info label="Ordered by" value={order.ordered_by_name || "—"} /><Info label="Visit" value={order.visit || t("Not linked")} />{order.collected_at && <><Info label="Collected by" value={order.collected_by_name || "—"} /><Info label="Collected at" value={formatDate(order.collected_at, true, language)} /></>}{order.cancelled_at && <><Info label="Cancelled by" value={order.cancelled_by_name || "—"} /><Info label="Cancelled at" value={formatDate(order.cancelled_at, true, language)} /></>}</div>{order.clinical_notes && <div className="mt-5 rounded-xl border bg-slate-50 dark:bg-slate-900/60 p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Clinical notes</p><p className="mt-2 whitespace-pre-wrap text-sm">{order.clinical_notes}</p></div>}{order.cancellation_reason && <Alert variant="destructive" className="mt-5"><Ban /><AlertDescription><strong>Cancellation reason:</strong> {order.cancellation_reason}</AlertDescription></Alert>}
    <div className="mt-6 overflow-x-auto rounded-xl border"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500 dark:text-slate-400"><tr>{["Test", "Specimen", "Result", "Reference", "Flag", "Resulted", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{order.items?.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><strong>{t(item.test_name)}</strong><small className="block text-slate-500 dark:text-slate-400">{item.test_code}</small></td><td className="p-3">{item.specimen_type ? t(item.specimen_type) : "—"}</td><td className="p-3 font-medium">{item.result || <span className="text-slate-400 dark:text-slate-500">Pending</span>} {item.result && item.result_unit}</td><td className="p-3">{item.reference_range || "—"}</td><td className="p-3">{item.is_abnormal ? <Badge className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">Abnormal</Badge> : item.result ? <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">Normal</Badge> : "—"}</td><td className="p-3"><span>{item.resulted_by_name || "—"}</span><small className="block text-slate-500 dark:text-slate-400">{formatDate(item.resulted_at, true, language)}</small></td><td className="p-3">{canLab && !["completed", "cancelled"].includes(order.status) && <Button size="sm" variant="outline" onClick={() => setResultItem(item)}><FilePenLine />{item.result ? "Correct" : "Result"}</Button>}</td></tr>)}</tbody></table></div>
    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">{canCancel && <Button variant="outline" className="text-red-700 dark:text-red-300" onClick={() => setCancelOpen(true)}><Ban />Cancel order</Button>}{canLab && order.status === "ordered" && <Button disabled={busy} onClick={collect}>{busy ? <LoaderCircle className="animate-spin" /> : <TestTubeDiagonal />}Mark specimen collected</Button>}<Button variant="outline" onClick={onClose}>Close</Button></div>
    {resultItem && <ResultForm order={order} item={resultItem} onClose={() => setResultItem(null)} onSaved={async () => { setResultItem(null); await reload(); onChanged("Laboratory result recorded."); }} />}
    {cancelOpen && <CancelOrder order={order} onClose={() => setCancelOpen(false)} onSaved={() => onChanged("Laboratory order cancelled.")} />}
  </Modal>;
}

function ResultForm({ order, item, onClose, onSaved }) {
  const [form, setForm] = useState({ result: item.result || "", result_unit: item.result_unit || "", reference_range: item.reference_range || "", is_abnormal: item.is_abnormal, correction_reason: "" }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { await jsonRequest(`lab-orders/${order.id}/results/${item.id}/`, form, "PATCH"); onSaved(); } catch (reason) { setError(reason); } finally { setSaving(false); } }
  return <Modal title={item.result ? "Correct result" : "Record result"} subtitle={`${item.test_name} · ${order.order_number}`} onClose={onClose}><form onSubmit={submit} className="space-y-4">{error && <FormError error={error} />}<Field label="Result" error={inputError(error, "result")}><Textarea required value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} placeholder="Enter the laboratory result…" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Unit" error={inputError(error, "result_unit")}><Input value={form.result_unit} onChange={(e) => setForm({ ...form, result_unit: e.target.value })} /></Field><Field label="Reference range" error={inputError(error, "reference_range")}><Input value={form.reference_range} onChange={(e) => setForm({ ...form, reference_range: e.target.value })} /></Field></div><label className="flex items-center gap-3 rounded-xl border p-4"><Checkbox checked={form.is_abnormal} onCheckedChange={(v) => setForm({ ...form, is_abnormal: Boolean(v) })} /><span><strong className="block text-sm">Mark as abnormal</strong><small className="text-slate-500 dark:text-slate-400">Highlights the result for clinical attention.</small></span></label>{item.resulted_at && <Field label="Correction reason" error={inputError(error, "correction_reason")}><Textarea required minLength={3} value={form.correction_reason} onChange={(e) => setForm({ ...form, correction_reason: e.target.value })} placeholder="Explain why this result is being corrected…" /></Field>}<FormActions onClose={onClose} saving={saving} label={item.result ? "Save correction" : "Record result"} /></form></Modal>;
}

function CancelOrder({ order, onClose, onSaved }) { const [reason, setReason] = useState(""); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { await jsonRequest(`lab-orders/${order.id}/cancel/`, { reason }); onSaved(); } catch (x) { setError(x); setSaving(false); } } return <Modal title="Cancel laboratory order" subtitle={`${order.order_number} · ${order.patient_name}`} onClose={onClose}><form onSubmit={submit} className="space-y-5">{error && <FormError error={error} />}<Alert variant="destructive"><TriangleAlert /><AlertDescription>Cancellation is permanent. Results can no longer be entered.</AlertDescription></Alert><Field label="Cancellation reason" error={inputError(error, "reason")}><Textarea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this order is being cancelled…" /></Field><FormActions onClose={onClose} saving={saving} label="Cancel order" destructive /></form></Modal>; }

function Tests({ user, notify }) {
  const [query, setQuery] = useState(""); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0); const [selected, setSelected] = useState(null); const [mode, setMode] = useState(null);
  const path = useMemo(() => `lab-tests/?page=${page}&ordering=name${query.trim() ? `&search=${encodeURIComponent(query.trim())}` : ""}`, [page, query]); const state = useLoad(path, refresh); const tests = rows(state.data); const write = hasRole(user, ...LAB_WRITE_ROLES);
  const saved = (message) => { setMode(null); setSelected(null); notify(message); setRefresh((x) => x + 1); };
  return <div><ResourceHeader title="Test catalog" count={state.data?.count ?? tests.length} action={write && <Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => setMode("create")}><Plus />New test</Button>} />{state.error && <ErrorBox message={state.error} retry={() => setRefresh((x) => x + 1)} />}<Card className="gap-0 overflow-hidden py-0"><div className="flex gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 p-4"><SearchBox value={query} set={(v) => { setQuery(v); setPage(1); }} placeholder="Code, test name, or specimen…" /><Button variant="outline" size="icon" onClick={() => setRefresh((x) => x + 1)}><RefreshCw className={state.loading ? "animate-spin" : ""} /></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500 dark:text-slate-400"><tr>{["Test", "Specimen", "Unit", "Reference range", "Service", "Status", ""].map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr></thead><tbody>{state.loading ? <LoadingRow cols={7} /> : !tests.length ? <EmptyRow cols={7} text="No tests match this search." /> : tests.map((t) => <tr key={t.id} className="border-t hover:bg-cyan-50/40"><td className="px-5 py-4"><strong className="block">{t.name}</strong><small className="text-slate-500 dark:text-slate-400">{t.code}</small></td><td className="px-5 py-4">{t.specimen_type || "—"}</td><td className="px-5 py-4">{t.unit || "—"}</td><td className="px-5 py-4">{t.reference_range || "—"}</td><td className="px-5 py-4">{t.service_name || t.service || "—"}</td><td className="px-5 py-4"><Badge className={t.is_active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}>{t.is_active ? "Active" : "Inactive"}</Badge></td><td className="px-5 py-4 text-right">{write && <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Test actions" title="Actions" className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900" />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 p-1.5"><DropdownMenuItem onClick={() => { setSelected(t); setMode("edit"); }}><Pencil />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => { setSelected(t); setMode("delete"); }}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</td></tr>)}</tbody></table></div><Pagination data={state.data} page={page} setPage={setPage} loading={state.loading} /></Card>{["create", "edit"].includes(mode) && <TestForm test={selected} onClose={() => setMode(null)} onSaved={() => saved(selected ? "Laboratory test updated." : "Laboratory test created.")} />}{mode === "delete" && <DeleteTest test={selected} onClose={() => setMode(null)} onSaved={() => saved("Laboratory test deleted.")} />}</div>;
}

function TestForm({ test, onClose, onSaved }) { const [services, setServices] = useState([]); const [form, setForm] = useState({ code: test?.code || "", name: test?.name || "", service: test?.service || "", specimen_type: test?.specimen_type || "", unit: test?.unit || "", reference_range: test?.reference_range || "", instructions: test?.instructions || "", is_active: test?.is_active ?? true }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); useEffect(() => { labApi("services/?is_laboratory=true&is_active=true&ordering=name&page_size=200").then((d) => setServices(rows(d))).catch(() => {}); }, []); async function submit(e) { e.preventDefault(); setSaving(true); setError(null); try { await jsonRequest(`lab-tests/${test ? `${test.id}/` : ""}`, { ...form, service: form.service || null }, test ? "PATCH" : "POST"); onSaved(); } catch (x) { setError(x); } finally { setSaving(false); } } return <Modal title={test ? "Edit laboratory test" : "New laboratory test"} subtitle="Configure specimen, reporting defaults, and optional billing service." onClose={onClose} wide><form onSubmit={submit} className="space-y-5">{error && <FormError error={error} />}<div className="grid gap-4 sm:grid-cols-2"><Field label="Test code" error={inputError(error, "code")}><Input required maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. CBC" /></Field><Field label="Test name" error={inputError(error, "name")}><Input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Complete blood count" /></Field><Field label="Laboratory service (optional)" error={inputError(error, "service")}><Select value={form.service} onChange={(service) => setForm({ ...form, service })} options={services.map((s) => [s.id, `${s.name}${s.price ? ` · AFN ${s.price}` : ""}`])} placeholder="No linked service" /></Field><Field label="Specimen type" error={inputError(error, "specimen_type")}><Input value={form.specimen_type} onChange={(e) => setForm({ ...form, specimen_type: e.target.value })} placeholder="e.g. Whole blood" /></Field><Field label="Result unit" error={inputError(error, "unit")}><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. g/dL" /></Field><Field label="Reference range" error={inputError(error, "reference_range")}><Input value={form.reference_range} onChange={(e) => setForm({ ...form, reference_range: e.target.value })} placeholder="e.g. 12–16" /></Field><div className="sm:col-span-2"><Field label="Patient preparation / instructions" error={inputError(error, "instructions")}><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Collection or preparation guidance…" /></Field></div></div><label className="flex items-center gap-3 rounded-xl border p-4"><Checkbox checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })} /><span><strong className="block text-sm">Active test</strong><small className="text-slate-500 dark:text-slate-400">Active tests can be added to new orders.</small></span></label><FormActions onClose={onClose} saving={saving} label={test ? "Save changes" : "Create test"} /></form></Modal>; }
function DeleteTest({ test, onClose, onSaved }) { const [saving, setSaving] = useState(false); const [error, setError] = useState(""); async function remove() { setSaving(true); setError(""); try { await labApi(`lab-tests/${test.id}/`, { method: "DELETE" }); onSaved(); } catch (e) { setError(errorSummary(e)); setSaving(false); } } return <Modal title="Delete laboratory test" subtitle="Tests already used in an order cannot be deleted." onClose={onClose}>{error && <ErrorBox message={error} retry={remove} />}<p className="text-sm text-slate-600 dark:text-slate-300">Permanently delete <strong className="text-slate-900 dark:text-slate-100">{test.name}</strong> ({test.code})?</p><div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={saving} onClick={remove}>{saving ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Delete</Button></div></Modal>; }

function Status({ value }) { return <Badge variant="secondary" className={STATUS_TONES[value] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}>{labelize(value)}</Badge>; }
function ResourceHeader({ title, count, action }) { return <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{count} record{count === 1 ? "" : "s"}</p></div>{action}</div>; }
function SearchBox({ value, set, placeholder }) { return <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><Input value={value} onChange={(e) => set(e.target.value)} className="pl-9" placeholder={placeholder} /></div>; }
function Pagination({ data, page, setPage, loading }) { return <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 sm:flex-row"><span className="text-sm text-muted-foreground">{data?.count ?? rows(data).length} total</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!data?.previous || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="px-2 py-2 text-xs text-muted-foreground">Page {page}</span><Button size="sm" variant="outline" disabled={!data?.next || loading} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div>; }
function LoadingRow({ cols }) { return <tr><td colSpan={cols} className="py-16 text-center text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />Loading…</td></tr>; }
function EmptyRow({ cols, text }) { return <tr><td colSpan={cols} className="py-16 text-center text-slate-500 dark:text-slate-400">{text}</td></tr>; }
function Info({ label, value }) { const { t } = useLanguage(); return <div className="rounded-xl border bg-slate-50/60 dark:bg-slate-900/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(label)}</p><div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div></div>; }
function ErrorBox({ message, retry }) { return <Alert variant="destructive" className="mb-4"><AlertCircle /><AlertDescription className="flex items-center justify-between gap-3">{message}{retry && <Button size="sm" variant="outline" onClick={retry}>Retry</Button>}</AlertDescription></Alert>; }
function FormError({ error }) { return <Alert variant="destructive"><AlertCircle /><AlertDescription>{errorSummary(error)}</AlertDescription></Alert>; }
function FormActions({ onClose, saving, label, destructive }) { return <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" variant={destructive ? "destructive" : "default"} className={destructive ? "" : "bg-cyan-700 hover:bg-cyan-800"} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : null}{label}</Button></div>; }
