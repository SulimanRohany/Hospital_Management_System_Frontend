"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArchiveRestore, ArrowDownToLine, BadgeDollarSign, Banknote, BarChart3,
  Boxes, CalendarRange, ChartNoAxesCombined, CheckCircle2, ClipboardList,
  FlaskConical, HandCoins, Landmark, LoaderCircle, PackageCheck, Percent, Pill,
  ReceiptText, RefreshCw, ShoppingCart, Stethoscope, TriangleAlert,
  UsersRound, WalletCards,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useLanguage } from "@/components/language-provider";
import {
  DataTable, DonutChart, EmptyReport, formatDate, HorizontalBars, LineChart,
  MetricCard, money, number, Panel, ReportError, ReportLoading, reportsApi,
} from "@/components/reports-ui";

const REPORT_ROLES = ["administrator", "reception", "pharmacy", "finance", "manager", "laboratory"];
const tabs = [
  { id: "overview", label: "Overview", icon: ChartNoAxesCombined, roles: REPORT_ROLES },
  { id: "reception", label: "Reception", icon: ClipboardList, roles: ["administrator", "reception", "finance", "manager"] },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, roles: ["administrator", "pharmacy", "finance", "manager"] },
  { id: "financial", label: "Financial", icon: Landmark, roles: ["administrator", "finance", "manager"] },
  { id: "laboratory", label: "Laboratory", icon: FlaskConical, roles: ["administrator", "laboratory", "manager"] },
  { id: "stock", label: "Stock", icon: Boxes, roles: ["administrator", "pharmacy", "finance", "manager"] },
];

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultRange() {
  const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29);
  return { start: localDate(start), end: localDate(end) };
}

function useReport(path, params = "", enabled = true) {
  const [state, setState] = useState({ key: null, error: null, data: null });
  const [revision, setRevision] = useState(0);
  const requestKey = `${path}?${params}#${revision}`;
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    reportsApi(`${path}${params ? `?${params}` : ""}`).then((data) => {
      if (live) setState({ key: requestKey, error: null, data });
    }).catch((error) => { if (live) setState({ key: requestKey, error, data: null }); });
    return () => { live = false; };
  }, [enabled, params, path, requestKey]);
  const current = state.key === requestKey;
  return {
    loading: enabled && !current,
    error: current ? state.error : null,
    data: current ? state.data : null,
    retry: () => setRevision((value) => value + 1),
  };
}

function DateFilters({ value, onApply, loading }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(value); const invalid = draft.start && draft.end && draft.end < draft.start;
  return <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
    <form className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:flex-row sm:flex-wrap sm:items-center" onSubmit={(event) => { event.preventDefault(); if (!invalid) onApply(draft); }}>
      <label className="sr-only" htmlFor="report-start-date">{t("Start date")}</label>
      <DatePicker id="report-start-date" className="sm:w-44" aria-label={t("Start date")} value={draft.start} onChange={(start) => setDraft({ ...draft, start })} />
      <label className="sr-only" htmlFor="report-end-date">{t("End date")}</label>
      <DatePicker id="report-end-date" className="sm:w-44" aria-label={t("End date")} value={draft.end} onChange={(end) => setDraft({ ...draft, end })} />
      <Button type="submit" className="bg-cyan-700 px-4 shadow-sm hover:bg-cyan-800 sm:w-auto" disabled={invalid || loading}>{loading ? <LoaderCircle className="animate-spin" /> : <BarChart3 />}{t("Run report")}</Button>
      {invalid && <span className="text-xs font-medium text-red-600 dark:text-red-300 sm:basis-full">{t("End date must be on or after start date.")}</span>}
    </form>
  </Card>;
}

function PeriodReport({ endpoint, children }) {
  const [range, setRange] = useState(defaultRange); const params = useMemo(() => new URLSearchParams(range).toString(), [range]);
  const report = useReport(`reports/${endpoint}/`, params);
  return <div className="space-y-5"><DateFilters value={range} onApply={setRange} loading={report.loading} />{report.error ? <ReportError error={report.error} retry={report.retry} /> : report.loading ? <ReportLoading /> : children(report.data)}</div>;
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const { user } = useAuth(); const available = tabs.filter((item) => item.roles.some((role) => hasRole(user, role)));
  const [tab, setTab] = useState(available[0]?.id || "overview");
  if (!REPORT_ROLES.some((role) => hasRole(user, role))) return <Alert variant="destructive"><TriangleAlert /><AlertDescription>{t("You do not have access to reporting and analytics.")}</AlertDescription></Alert>;
  return <div className="operations-section">
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_90%_20%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#eefcff,#f8fafc)] px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-colors dark:border-slate-700 dark:bg-[radial-gradient(circle_at_90%_20%,rgba(34,211,238,.12),transparent_25%),linear-gradient(135deg,#081827,#0f172a)] sm:px-7">
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300"><span className="flex size-7 items-center justify-center rounded-lg bg-cyan-100 dark:bg-slate-800"><Activity className="size-3.5" /></span>{t("Decision intelligence")}</div><h1 className="text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-slate-50 sm:text-4xl">{t("Reports & analytics")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t("A live, role-aware view of clinical activity, revenue, cash flow, laboratory demand, and medicine inventory.")}</p></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"><span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129_/.12)]"/><div><p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("Live operational data")}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{t("Calculated from posted records")}</p></div></div></div>
    </div>
    <div className="tab-scrollbar mb-6 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-sm" role="tablist" aria-label={t("Report sections")}>
      {available.map(({ id, label, icon: Icon }) => {
        const isActive = tab === id;
        return (
          <Button
            key={id}
            role="tab"
            aria-selected={isActive}
            variant={isActive ? "default" : "outline"}
            onClick={() => setTab(id)}
            className={isActive ? "shrink-0 border-cyan-700 bg-cyan-700 shadow-sm hover:bg-cyan-800" : "shrink-0 border-transparent bg-transparent text-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"}
          >
            <Icon />{t(label)}
          </Button>
        );
      })}
    </div>
    {tab === "overview" && <OverviewReport user={user} />}
    {tab === "reception" && <ReceptionReport />}
    {tab === "pharmacy" && <PharmacyReport />}
    {tab === "financial" && <FinancialReport />}
    {tab === "laboratory" && <LaboratoryReport />}
    {tab === "stock" && <StockReport />}
  </div>;
}

function OverviewReport({ user }) {
  const dashboard = useReport("dashboard/");
  const canTrend = hasRole(user, "administrator", "reception", "pharmacy", "finance", "manager");
  const trend = useReport("reports/income-trend/", "", canTrend);
  if (dashboard.error) return <ReportError error={dashboard.error} retry={dashboard.retry} />;
  if (dashboard.loading) return <ReportLoading label="Loading hospital overview…" />;
  const data = dashboard.data; const overall = data.overall || {}; const today = data.today || {};
  const chartData = canTrend && trend.data ? mergeTrend(trend.data) : [];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-700 dark:text-cyan-300">Executive pulse</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Hospital at a glance</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Updated {formatDate(data.as_of, true)}</p></div><Button size="sm" variant="outline" onClick={dashboard.retry}><RefreshCw />Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={UsersRound} label="Patients today" value={number(today.patients)} detail={`${number(overall.total_patients)} active patients overall`} tone="cyan"/><MetricCard icon={ReceiptText} label="Reception today" value={`AFN ${money(today.reception_income)}`} detail={`AFN ${money(overall.reception_income)} overall`} tone="blue"/><MetricCard icon={ShoppingCart} label="Pharmacy sales today" value={`AFN ${money(today.pharmacy_sales)}`} detail={`AFN ${money(overall.pharmacy_sales)} overall`} tone="violet"/><MetricCard icon={BadgeDollarSign} label="Profit today" value={`AFN ${money(today.pharmacy_profit)}`} detail={`AFN ${money(overall.pharmacy_profit)} overall`} tone="emerald"/></div>
    {canTrend && <Panel title="Income momentum" subtitle="Reception and pharmacy income over the last 12 months" action={trend.loading ? <LoaderCircle className="size-4 animate-spin text-cyan-700 dark:text-cyan-300"/> : null}>{trend.error ? <div className="p-5"><ReportError error={trend.error} retry={trend.retry}/></div> : trend.loading ? <ReportLoading/> : <LineChart series={[{name:"Reception", color:"#0891b2", values:chartData.map((item)=>({label:item.label,value:item.reception}))},{name:"Pharmacy",color:"#7c3aed",values:chartData.map((item)=>({label:item.label,value:item.pharmacy}))}]}/>}</Panel>}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><Panel title="Today’s reception activity" subtitle="Latest non-cancelled visits"><DataTable emptyTitle="No reception visits today" rows={data.today_receptions || []} columns={[{label:"Visit",render:(row)=><div><strong className="text-slate-900 dark:text-slate-100">{row.patient}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{row.visit_number} · {row.gender} · age {row.age}</p></div>},{label:"Department",key:"department"},{label:"Time",render:(row)=>formatDate(row.date,true)},{label:"Paid",align:"right",render:(row)=>`AFN ${money(row.paid)}`}]} /></Panel><Panel title="Financial position" subtitle="Overall balances and obligations"><div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">{[["Stock value",overall.pharmacy_stock_value],["Purchases",overall.pharmacy_purchases],["Expenses",overall.total_expenses],["Supplier due",overall.suppliers_due]].map(([label,value])=><div key={label} className="bg-white dark:bg-slate-900 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">AFN {money(value)}</p></div>)}</div><div className="border-t p-5"><p className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-300">Wallet balances</p>{Object.entries(data.wallets || {}).map(([key,value])=><div key={key} className="mb-2 flex items-center justify-between text-xs"><span className="capitalize text-slate-500 dark:text-slate-400">{key}</span><strong className="tabular-nums text-slate-900 dark:text-slate-100">AFN {money(value)}</strong></div>)}</div></Panel></div>
  </div>;
}

function mergeTrend(data) {
  const map = new Map();
  for (const [source, values] of Object.entries(data || {})) for (const point of values || []) { const key = String(point.month).slice(0,7); const row = map.get(key) || { key, reception:0, pharmacy:0 }; row[source] = Number(point.total || 0); map.set(key,row); }
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`;
  return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((row)=>({...row,label:new Intl.DateTimeFormat(locale,{month:"short",year:"2-digit",timeZone:"UTC"}).format(new Date(`${row.key}-01T00:00:00Z`))}));
}

function ReceptionReport() {
  return <PeriodReport endpoint="reception">{(data)=>{const s=data.summary||{}; const departments=(data.by_department||[]).map((item)=>({...item,label:item.department__name,value:Number(item.paid||0)})); return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ClipboardList} label="Visits" value={number(s.visits)} detail={`${number(s.patients)} unique patients`} tone="cyan"/><MetricCard icon={Banknote} label="Gross charges" value={`AFN ${money(s.total)}`} detail={`AFN ${money(s.discounts)} discounted`} tone="blue"/><MetricCard icon={CheckCircle2} label="Collected" value={`AFN ${money(s.paid)}`} detail={`${s.net ? number(Number(s.paid)/Number(s.net)*100,1) : "0.0"}% of net charges`} tone="emerald"/><MetricCard icon={HandCoins} label="Outstanding" value={`AFN ${money(s.outstanding)}`} detail="Net amount not yet paid" tone="amber" warning={Number(s.outstanding)>0}/></div><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Collections by department" subtitle="Paid amount contribution"><HorizontalBars data={departments} formatter={(v)=>`AFN ${money(v)}`} emptyTitle="No department activity"/></Panel><Panel title="Department performance" subtitle="Visits, billing, discounts and collections"><DataTable rows={data.by_department} columns={[{label:"Department",render:(r)=><strong className="text-slate-900 dark:text-slate-100">{r.department__name}</strong>},{label:"Visits",key:"visits",align:"right"},{label:"Total",align:"right",render:(r)=>`AFN ${money(r.total)}`},{label:"Discounts",align:"right",render:(r)=>`AFN ${money(r.discounts)}`},{label:"Paid",align:"right",render:(r)=><strong className="text-emerald-700 dark:text-emerald-300">AFN {money(r.paid)}</strong>}]} /></Panel></div></div>;}}</PeriodReport>;
}

function PharmacyReport() {
  return <PeriodReport endpoint="pharmacy">{(data)=>{const due=Number(data.purchases_due_at_posting||0); const suppliers=(data.purchases_by_supplier||[]).map((item)=>({...item,label:item.supplier__name,value:Number(item.total||0)})); return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ShoppingCart} label="Sales" value={`AFN ${money(data.sales_total)}`} detail={`${number(data.sales_count)} posted sales`} tone="cyan"/><MetricCard icon={BadgeDollarSign} label="Gross profit" value={`AFN ${money(data.profit)}`} detail={`${data.sales_total ? number(Number(data.profit)/Number(data.sales_total)*100,1) : "0.0"}% sales margin`} tone="emerald"/><MetricCard icon={PackageCheck} label="Purchases" value={`AFN ${money(data.purchases_total)}`} detail={`${number(data.purchases_count)} posted purchases`} tone="violet"/><MetricCard icon={HandCoins} label="Purchase due" value={`AFN ${money(due)}`} detail={`AFN ${money(data.purchases_paid)} paid`} tone="amber" warning={due>0}/></div><div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><Panel title="Sales composition" subtitle="Revenue, discounts and profit"><DonutChart centerLabel="sales" formatter={(v)=>`AFN ${money(v,true)}`} data={[{label:"Collected",value:data.sales_paid,color:"#10b981"},{label:"Discounts",value:data.sales_discounts,color:"#f59e0b"},{label:"Profit",value:data.profit,color:"#7c3aed"}]}/></Panel><Panel title="Purchases by supplier" subtitle="Posted purchase value in this period"><HorizontalBars data={suppliers} formatter={(v)=>`AFN ${money(v)}`} emptyTitle="No supplier purchases" color="#7c3aed"/></Panel></div><Panel title="Supplier purchasing detail" subtitle="Purchase volume and payment position"><DataTable rows={data.purchases_by_supplier} columns={[{label:"Supplier",render:(r)=><strong className="text-slate-900 dark:text-slate-100">{r.supplier__name}</strong>},{label:"Purchases",key:"count",align:"right"},{label:"Total",align:"right",render:(r)=>`AFN ${money(r.total)}`},{label:"Paid",align:"right",render:(r)=>`AFN ${money(r.paid)}`},{label:"Due",align:"right",render:(r)=><strong className={Number(r.total)-Number(r.paid)>0?"text-amber-700 dark:text-amber-300":"text-emerald-700 dark:text-emerald-300"}>AFN {money(Number(r.total)-Number(r.paid))}</strong>}]} /></Panel></div>;}}</PeriodReport>;
}

function FinancialReport() {
  return <PeriodReport endpoint="financial">{(data)=>{const categories=(data.expenses_by_category||[]).map((item)=>({label:item.category__name||"Uncategorized",value:item.total})); const suppliers=[...(data.supplier_due||[])].sort((a,b)=>Number(b.amount_due)-Number(a.amount_due)); return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ReceiptText} label="Expenses" value={`AFN ${money(data.expenses_total)}`} detail={`${number(data.expenses_by_category?.reduce((n,r)=>n+Number(r.count),0))} expense records`} tone="rose"/><MetricCard icon={ArrowDownToLine} label="Wallet credits" value={`AFN ${money(data.credits)}`} detail="Cash flowing into wallets" tone="emerald"/><MetricCard icon={Banknote} label="Wallet debits" value={`AFN ${money(data.debits)}`} detail="Cash flowing out of wallets" tone="amber"/><MetricCard icon={ArchiveRestore} label="Turnovers" value={`AFN ${money(data.turnovers?.total)}`} detail={`${number(data.turnovers?.count)} handovers`} tone="violet"/></div><div className="grid gap-5 xl:grid-cols-2"><Panel title="Expense mix" subtitle="Spending by operational category"><DonutChart centerLabel="expenses" formatter={(v)=>`AFN ${money(v,true)}`} data={categories}/></Panel><Panel title="Supplier obligations" subtitle="Current amount due, independent of period"><HorizontalBars data={suppliers.map(r=>({...r,label:r.name,value:r.amount_due}))} formatter={(v)=>`AFN ${money(v)}`} emptyTitle="No supplier balances due" color="#f59e0b"/></Panel></div><div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel title="Wallet position" subtitle="Live balances across active accountable wallets"><DataTable rows={data.wallets} columns={[{label:"Wallet",render:(r)=><div><strong className="text-slate-900 dark:text-slate-100">{r.name}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{r.code}</p></div>},{label:"Type",render:(r)=><Badge variant="outline" className="capitalize">{r.kind}</Badge>},{label:"Balance",align:"right",render:(r)=><strong className={Number(r.balance)<0?"text-red-700 dark:text-red-300":"text-slate-900 dark:text-slate-100"}>AFN {money(r.balance)}</strong>}]} /></Panel><Panel title="Turnover status" subtitle="Custody handovers by workflow state"><DonutChart centerLabel="handovers" data={(data.turnovers?.by_status||[]).map(r=>({label:String(r.status).replaceAll("_"," "),value:r.count}))}/></Panel></div></div>;}}</PeriodReport>;
}

function LaboratoryReport() {
  return <PeriodReport endpoint="laboratory">{(data)=>{const statuses=(data.by_status||[]).map(r=>({label:String(r.status).replaceAll("_"," "),value:r.count})); const tests=(data.test_volume||[]).map(r=>({...r,label:r.items__test__name||"Unknown test",value:r.count})); return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><MetricCard icon={FlaskConical} label="Lab orders" value={number(data.total_orders)} detail="Orders created in this period" tone="cyan"/><MetricCard icon={Stethoscope} label="Test volume" value={number(tests.reduce((n,r)=>n+Number(r.value),0))} detail={`${number(tests.length)} distinct tests`} tone="violet"/><MetricCard icon={CheckCircle2} label="Completed" value={number(statuses.filter(r=>["completed","verified","reported"].includes(r.label)).reduce((n,r)=>n+Number(r.value),0))} detail="Finalized laboratory work" tone="emerald"/></div><div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><Panel title="Order workflow" subtitle="Laboratory orders grouped by status"><DonutChart centerLabel="orders" data={statuses}/></Panel><Panel title="Most requested tests" subtitle="Test item volume across laboratory orders"><HorizontalBars data={tests} emptyTitle="No laboratory tests in this period" color="#7c3aed"/></Panel></div><Panel title="Test volume detail" subtitle="Complete requested-test ranking"><DataTable rows={tests} columns={[{label:"Test",render:(r)=><strong className="text-slate-900 dark:text-slate-100">{r.label}</strong>},{label:"Orders",align:"right",render:(r)=>number(r.value)},{label:"Share",align:"right",render:(r)=>`${tests.reduce((n,x)=>n+Number(x.value),0)?number(Number(r.value)/tests.reduce((n,x)=>n+Number(x.value),0)*100,1):0}%`}]} /></Panel></div>;}}</PeriodReport>;
}

function StockReport() {
  const [filters,setFilters]=useState({expiry_days:"90",include_inactive:false}); const [applied,setApplied]=useState(filters); const [view,setView]=useState("low");
  const params=useMemo(()=>new URLSearchParams({expiry_days:applied.expiry_days,include_inactive:String(applied.include_inactive)}).toString(),[applied]); const report=useReport("reports/stock/",params);
  const invalid=filters.expiry_days===""||Number(filters.expiry_days)<0||Number(filters.expiry_days)>3650;
  return <div className="space-y-5"><Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm"><form className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:flex-row sm:flex-wrap sm:items-center" onSubmit={(event)=>{event.preventDefault();if(!invalid)setApplied(filters);}}><label className="sr-only" htmlFor="stock-expiry-days">Expiry horizon in days</label><Input id="stock-expiry-days" className="bg-white dark:bg-slate-900 sm:w-52" type="number" min="0" max="3650" placeholder="Expiry horizon (days)" aria-label="Expiry horizon in days" value={filters.expiry_days} onChange={(e)=>setFilters({...filters,expiry_days:e.target.value})}/><label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300"><Checkbox checked={filters.include_inactive} onCheckedChange={(value)=>setFilters({...filters,include_inactive:Boolean(value)})}/>Include inactive stock</label><Button type="submit" className="bg-cyan-700 px-4 shadow-sm hover:bg-cyan-800 sm:w-auto" disabled={report.loading||invalid}>{report.loading?<LoaderCircle className="animate-spin"/>:<BarChart3/>}Run report</Button></form></Card>{report.error?<ReportError error={report.error} retry={report.retry}/>:report.loading?<ReportLoading label="Analyzing medicine inventory…"/>:<StockResults data={report.data} view={view} setView={setView}/>}</div>;
}

function StockResults({data,view,setView}) { const s=data.summary||{}; const rows=view==="low"?data.low_stock:view==="near"?data.near_expiry:data.expired; return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><MetricCard icon={PackageCheck} label="Usable stock value" value={`AFN ${money(s.stock_value)}`} detail={`${number(s.usable_quantity,3)} units in ${number(s.usable_batches)} batches`} tone="emerald"/><MetricCard icon={TriangleAlert} label="Low stock medicines" value={number(s.low_stock_medicines)} detail="At or below reorder level" tone="amber" warning={s.low_stock_medicines>0}/><MetricCard icon={CalendarRange} label={`Expiring in ${data.expiry_days} days`} value={number(s.near_expiry_batches)} detail={`${number(s.expired_batches)} already expired batches`} tone="rose" warning={s.near_expiry_batches>0||s.expired_batches>0}/></div><Panel title="Inventory attention queue" subtitle={`Stock position as of ${formatDate(data.as_of)}`} action={<div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">{[["low","Low stock",s.low_stock_medicines],["near","Near expiry",s.near_expiry_batches],["expired","Expired",s.expired_batches]].map(([id,label,count])=><button key={id} type="button" onClick={()=>setView(id)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${view===id?"bg-white dark:bg-slate-900 text-cyan-800 dark:text-cyan-300 shadow-sm":"text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}>{label} <span className="ml-1 tabular-nums">{count}</span></button>)}</div>}>{view==="low"?<DataTable rows={rows} emptyTitle="No medicines are below reorder level" columns={[{label:"Medicine",render:(r)=><div><strong className="text-slate-900 dark:text-slate-100">{r.name}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{r.code}{r.strength?` · ${r.strength}`:""}</p></div>},{label:"Available",align:"right",render:(r)=>number(r.available,3)},{label:"Reorder level",align:"right",render:(r)=>number(r.reorder_level,3)},{label:"Deficit",align:"right",render:(r)=><strong className="text-amber-700 dark:text-amber-300">{number(Math.max(0,Number(r.reorder_level)-Number(r.available)),3)}</strong>}]} />:<DataTable rows={rows} emptyTitle={view==="near"?"No batches nearing expiry":"No expired batches in stock"} columns={[{label:"Medicine",render:(r)=><div><strong className="text-slate-900 dark:text-slate-100">{r.medicine__name}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{r.medicine__code}</p></div>},{label:"Batch",render:(r)=><span className="font-mono text-xs text-slate-700 dark:text-slate-300">{r.batch_number}</span>},{label:"Expiry",render:(r)=><strong className={view==="expired"?"text-red-700 dark:text-red-300":"text-amber-700 dark:text-amber-300"}>{formatDate(r.expiry_date)}</strong>},{label:"Quantity",align:"right",render:(r)=>number(r.quantity_available,3)},...(view==="near"?[{label:"Sale price",align:"right",render:(r)=>`AFN ${money(r.sale_price)}`}]:[])]}/>}</Panel></div>; }
