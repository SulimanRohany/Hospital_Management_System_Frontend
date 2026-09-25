"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeDollarSign, Boxes, ClipboardList, HandCoins, Landmark,
  PackageCheck, Plus, RefreshCw, ShoppingCart, Sparkles, TriangleAlert, UsersRound, WalletCards,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { hasRole } from "@/lib/roles";
import {
  DataTable, formatDate, LineChart, MetricCard, money, Panel, ReportError,
  ReportLoading, reportsApi,
} from "@/components/reports-ui";

const TREND_ROLES = ["administrator", "reception", "pharmacy", "finance", "manager"];
const STOCK_ROLES = ["administrator", "pharmacy", "finance", "manager"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, trend: null, stock: null, error: null });
  const canViewTrend = hasRole(user, ...TREND_ROLES);
  const canViewStock = hasRole(user, ...STOCK_ROLES);

  useEffect(() => {
    let live = true;
    const requests = [
      reportsApi("dashboard/"),
      canViewTrend ? reportsApi("reports/income-trend/") : Promise.resolve(null),
      canViewStock ? reportsApi("reports/stock/?expiry_days=30") : Promise.resolve(null),
    ];
    Promise.all(requests).then(([data, trend, stock]) => {
      if (live) setState({ loading: false, data, trend, stock, error: null });
    }).catch((error) => {
      if (live) setState({ loading: false, data: null, trend: null, stock: null, error });
    });
    return () => { live = false; };
  }, [canViewStock, canViewTrend, revision]);

  if (state.loading) return <ReportLoading label="Preparing your hospital overview…" />;
  if (state.error) return <ReportError error={state.error} retry={() => { setState((value) => ({ ...value, loading: true })); setRevision((value) => value + 1); }} />;

  const data = state.data; const today = data.today || {}; const overall = data.overall || {};
  const firstName = user.first_name || user.username;
  return <div className="operations-section dashboard-overview space-y-5">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[#072f3b] px-6 py-7 text-white shadow-[0_22px_55px_rgb(8_47_59_/_0.2)] sm:px-8 sm:py-8">
      <div className="absolute -right-16 -top-24 size-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-blue-500/15 blur-3xl" />
      <svg className="absolute bottom-0 right-0 h-full w-1/2 opacity-[.08]" viewBox="0 0 500 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 144h80l24-50 42 91 44-128 42 87h58l25-34 28 34h157" fill="none" stroke="white" strokeWidth="3"/><path d="M0 180C100 130 160 210 245 154S390 75 500 110" fill="none" stroke="white" strokeWidth="2"/></svg>
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
        <div className="max-w-2xl"><p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200"><Sparkles className="size-3.5" />Operational intelligence</p><h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-[2.6rem]">Good day, {firstName}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Your hospital is connected and running. Here is a live view of today’s patient flow, revenue, and inventory health.</p></div>
        <div className="flex flex-wrap items-center gap-2.5"><div className="mr-1 hidden rounded-xl border border-white/10 bg-white/[.06] px-4 py-2.5 backdrop-blur sm:block"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-cyan-200">Today</p><p className="mt-0.5 text-xs font-medium text-white">{new Intl.DateTimeFormat(language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</p></div><Button variant="outline" size="icon" aria-label="Refresh overview" className="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { setState((value) => ({ ...value, loading: true })); setRevision((value) => value + 1); }}><RefreshCw /></Button><Button className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-lg hover:bg-cyan-50" render={<Link href="/dashboard/reception" />}><Plus />New visit</Button></div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={UsersRound} label="Patients today" value={Number(today.patients || 0).toLocaleString()} detail={`${Number(overall.total_patients || 0).toLocaleString()} active patients overall`} tone="cyan" />
      <MetricCard icon={ClipboardList} label="Reception income" value={`AFN ${money(today.reception_income)}`} detail="Collected today" tone="blue" />
      <MetricCard icon={ShoppingCart} label="Pharmacy sales" value={`AFN ${money(today.pharmacy_sales)}`} detail="Posted today" tone="violet" />
      <MetricCard icon={BadgeDollarSign} label="Pharmacy profit" value={`AFN ${money(today.pharmacy_profit)}`} detail="Margin after discounts today" tone="emerald" />
    </div>

    {state.trend && <Panel title="Income momentum" subtitle="Reception and pharmacy performance across the last 12 months" action={<Button variant="ghost" size="sm" className="text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 hover:text-cyan-800" render={<Link href="/dashboard/reports" />}>Explore report<ArrowRight /></Button>}><OverviewTrend data={state.trend} /></Panel>}

    <div className={`grid gap-5 ${state.stock ? "xl:grid-cols-[1.2fr_.8fr]" : "xl:grid-cols-[1.3fr_.7fr]"}`}>
      <Panel title="Today’s reception" subtitle="Latest non-cancelled patient visits" action={<Button variant="ghost" size="sm" render={<Link href="/dashboard/reports" />}>View all<ArrowRight /></Button>}><DataTable emptyTitle="No reception visits recorded today" rows={data.today_receptions || []} columns={[{ label: "Patient", render: (row) => <div><strong className="text-slate-900 dark:text-slate-100">{row.patient}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{row.visit_number} · {row.gender} · age {row.age}</p></div> }, { label: "Department", key: "department" }, { label: "Time", render: (row) => formatDate(row.date, true) }, { label: "Paid", align: "right", render: (row) => <strong className="text-emerald-700 dark:text-emerald-300">AFN {money(row.paid)}</strong> }]} /></Panel>
      {state.stock ? <StockAlerts data={state.stock} /> : <FinancialSnapshot data={data} />}
    </div>

    {state.stock && <div className="grid gap-5 xl:grid-cols-2"><FinancialSnapshot data={data} /><OverallPosition data={overall} /></div>}
  </div>;
}

function OverviewTrend({ data }) {
  const { language } = useLanguage();
  const values = useMemo(() => {
    const months = new Map();
    for (const [source, points] of Object.entries(data || {})) for (const point of points || []) {
      const key = String(point.month).slice(0, 7); const row = months.get(key) || { key, reception: 0, pharmacy: 0 };
      row[source] = Number(point.total || 0); months.set(key, row);
    }
    return [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, label: new Intl.DateTimeFormat(language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`, { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${row.key}-01T00:00:00Z`)) }));
  }, [data, language]);
  const receptionTotal = values.reduce((sum, item) => sum + item.reception, 0);
  const pharmacyTotal = values.reduce((sum, item) => sum + item.pharmacy, 0);
  const strongest = values.reduce((best, item) => item.reception + item.pharmacy > (best?.reception || 0) + (best?.pharmacy || 0) ? item : best, null);
  return <><div className="grid gap-px border-b border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 sm:grid-cols-3">{[["Reception total", receptionTotal, "text-cyan-700 dark:text-cyan-300"], ["Pharmacy total", pharmacyTotal, "text-violet-700 dark:text-violet-300"], ["Strongest month", strongest?.label, "text-slate-950 dark:text-slate-50"]].map(([label, value, color]) => <div key={label} className="bg-white dark:bg-slate-900 px-5 py-3.5"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400 dark:text-slate-500">{label}</p><p className={`mt-1 text-sm font-semibold ${color}`}>{label === "Strongest month" ? value || "—" : `AFN ${money(value, true)}`}</p></div>)}</div><LineChart height={260} series={[{ name: "Reception", color: "#0891b2", values: values.map((item) => ({ label: item.label, value: item.reception })) }, { name: "Pharmacy", color: "#7c3aed", values: values.map((item) => ({ label: item.label, value: item.pharmacy })) }]} /></>;
}

function StockAlerts({ data }) {
  const summary = data.summary || {}; const attention = Number(summary.low_stock_medicines || 0) + Number(summary.near_expiry_batches || 0) + Number(summary.expired_batches || 0);
  return <Panel title="Inventory alerts" subtitle="Items needing pharmacy attention" action={<Button variant="ghost" size="sm" render={<Link href="/dashboard/reports" />}>Open stock report<ArrowRight /></Button>}><div className="p-5"><div className={`mb-5 flex items-center gap-3 rounded-xl border p-4 ${attention ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40" : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"}`}><span className={`flex size-10 items-center justify-center rounded-xl ${attention ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}>{attention ? <TriangleAlert className="size-5" /> : <PackageCheck className="size-5" />}</span><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{attention ? `${attention} inventory alerts` : "Inventory is healthy"}</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Based on a 30-day expiry horizon</p></div></div><div className="grid grid-cols-3 divide-x rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">{[["Low stock", summary.low_stock_medicines], ["Near expiry", summary.near_expiry_batches], ["Expired", summary.expired_batches]].map(([label, value]) => <div key={label} className="p-3 text-center"><strong className={Number(value) ? "text-lg text-amber-700 dark:text-amber-300" : "text-lg text-slate-900 dark:text-slate-100"}>{Number(value || 0).toLocaleString()}</strong><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p></div>)}</div><div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500 dark:text-slate-400">Usable inventory value</span><strong className="text-slate-900 dark:text-slate-100">AFN {money(summary.stock_value)}</strong></div></div></Panel>;
}

function FinancialSnapshot({ data }) {
  const wallets = data.wallets || {}; const total = Object.values(wallets).reduce((sum, value) => sum + Number(value || 0), 0);
  return <Panel title="Wallet snapshot" subtitle="Live accountable cash balances" action={<WalletCards className="size-4 text-cyan-700 dark:text-cyan-300" />}><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Combined balance</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">AFN {money(total)}</p><div className="mt-5 space-y-3">{Object.entries(wallets).map(([name, value]) => <div key={name} className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs capitalize text-slate-600 dark:text-slate-300"><span className="size-2 rounded-full bg-cyan-500" />{name}</span><strong className="text-xs tabular-nums text-slate-900 dark:text-slate-100">AFN {money(value)}</strong></div>)}</div></div></Panel>;
}

function OverallPosition({ data }) {
  return <Panel title="Overall financial position" subtitle="Cumulative operational totals" action={<Landmark className="size-4 text-cyan-700 dark:text-cyan-300" />}><div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">{[["Reception income", data.reception_income, ClipboardList], ["Pharmacy sales", data.pharmacy_sales, ShoppingCart], ["Total expenses", data.total_expenses, HandCoins], ["Supplier due", data.suppliers_due, Boxes]].map(([label, value, Icon]) => <div key={label} className="bg-white dark:bg-slate-900 p-5"><Icon className="mb-3 size-4 text-slate-400 dark:text-slate-500" /><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">AFN {money(value)}</p></div>)}</div></Panel>;
}
