"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Banknote, BookOpenText,
  CheckCircle2, CircleDollarSign, EllipsisVertical, Eye, FolderCog, Landmark,
  LoaderCircle, MoreHorizontal, Pencil, Plus, ReceiptText, RefreshCw, Search, Trash2, Undo2, WalletCards,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDate, money, rows, Select } from "@/components/pharmacy-ui";
import { CategoryForm, ConfirmAction, ExpenseForm, FinanceDetail, TurnoverForm, VoidExpenseForm, WalletForm } from "@/components/finance-forms";
import { ErrorBox, FINANCE_ROLES, financeApi, LoadingBlock } from "@/components/finance-ui";
import { withSectionRole } from "@/lib/roles";

const tabs = [
  ["overview", "Overview", CircleDollarSign],
  ["wallets", "Wallets", WalletCards],
  ["transactions", "Ledger", BookOpenText],
  ["expenses", "Expenses", ReceiptText],
  ["turnovers", "Turnovers", ArrowRightLeft],
  ["categories", "Categories", FolderCog],
];

const resourceConfig = {
  wallets: { endpoint: "wallets", title: "Wallets", subtitle: "Cash locations and live audited balances", search: "Code or wallet name", columns: ["Wallet", "Type", "Balance", "Negative policy", "Status"], create: "New wallet" },
  transactions: { endpoint: "wallet-transactions", title: "Wallet ledger", subtitle: "Immutable credits, debits, sources and running balances", search: "Reference, description or source", columns: ["Reference", "Date", "Wallet", "Category", "Movement", "Balance after"] },
  expenses: { endpoint: "expenses", title: "Expenses", subtitle: "Posted operational costs and retained void history", search: "Purpose, payee, receipt, category or wallet", columns: ["Expense", "Date", "Category", "Wallet", "Amount", "Status"], create: "Post expense" },
  turnovers: { endpoint: "turnovers", title: "Turnovers", subtitle: "Period-based handovers between accountable wallets", search: "Source or destination wallet", columns: ["Route", "Period", "Amount", "Handed over by", "Created", "Status"], create: "New turnover" },
  categories: { endpoint: "expense-categories", title: "Expense categories", subtitle: "Controlled classifications for operational spending", search: "Category name or description", columns: ["Category", "Description", "Status", "Updated"], create: "New category" },
};

export default function FinancePage() {
  const { user: account } = useAuth();
  const user = withSectionRole(account, "finance");
  const [tab, setTab] = useState("overview");
  const [notice, setNotice] = useState("");

  if (!hasRole(user, ...FINANCE_ROLES)) {
    return <Alert variant="destructive"><AlertCircle /><AlertDescription>You do not have access to finance operations.</AlertDescription></Alert>;
  }

  return <div className="pharmacy-section">
    <div className="mb-7 overflow-hidden rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:px-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Treasury and accountable operations</p><h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Finance</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Wallet balances, expenses, immutable ledger activity and cash handovers in one audited workspace.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-white/80 dark:bg-slate-900/80 px-4 py-3 shadow-sm"><span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"><Landmark className="size-4" /></span><span><strong className="block text-xs text-slate-900 dark:text-slate-100">Finance control center</strong><small className="text-slate-500 dark:text-slate-400">Live ledger-backed balances</small></span></div>
      </div>
    </div>

    {notice && <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="text-emerald-700 dark:text-emerald-300" /><AlertDescription className="text-emerald-800 dark:text-emerald-300">{notice}</AlertDescription></Alert>}

    <div className="mb-7 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-sm" role="tablist" aria-label="Finance sections">
      {tabs.map(([key, label, Icon]) => <Button key={key} variant={tab === key ? "default" : "outline"} role="tab" aria-selected={tab === key} className={tab === key ? "border-cyan-700 bg-cyan-700 shadow-sm hover:bg-cyan-800" : "border-transparent bg-transparent text-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"} onClick={() => setTab(key)}><Icon />{label}</Button>)}
    </div>

    {tab === "overview" ? <FinanceOverview user={user} go={setTab} /> : <ResourcePage kind={tab} user={user} notify={(message) => { setNotice(message); window.setTimeout(() => setNotice(""), 5000); }} />}
  </div>;
}

function FinanceOverview({ user, go }) {
  const { t } = useLanguage();
  const [data, setData] = useState({ wallets: [], transactions: [], expenses: [], turnovers: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
        const [wallets, transactions, expenses, turnovers] = await Promise.all([
          financeApi("wallets/?ordering=name&page_size=100"), financeApi(`wallet-transactions/?start=${start}&ordering=-transaction_date&page_size=100`),
          financeApi(`expenses/?is_void=false&start=${start}&ordering=-expense_date&page_size=100`), financeApi("turnovers/?ordering=-created_at&page_size=100"),
        ]);
        if (live) setData({ wallets: rows(wallets), transactions: rows(transactions), expenses: rows(expenses), turnovers: rows(turnovers) });
      } catch (reason) { if (live) setError(reason); } finally { if (live) setLoading(false); }
    }
    load(); return () => { live = false; };
  }, [refresh]);

  const totalBalance = data.wallets.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const expenseTotal = data.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const awaiting = data.turnovers.filter((item) => item.status === "handed_over");
  const activeWallets = data.wallets.filter((item) => item.is_active);
  const credits = data.transactions.filter((item) => item.entry_type === "credit").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const debits = data.transactions.filter((item) => item.entry_type === "debit").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (error) return <ErrorBox error={error} retry={() => setRefresh((value) => value + 1)} />;

  return <div>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300"><CircleDollarSign className="size-4" /></span><span className="text-xs font-bold uppercase tracking-[.15em] text-cyan-700 dark:text-cyan-300">Financial position</span></div><h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Today’s finance workspace</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Balances, recent outflow and outstanding custody confirmations.</p></div><Button variant="outline" size="icon" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh finance overview"><RefreshCw className={loading ? "animate-spin" : ""} /></Button></div>

    <div className="grid overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <Signal icon={WalletCards} label="Combined balance" value={loading ? "…" : `AFN ${money(totalBalance)}`} detail={t(`${activeWallets.length} active wallets`)} tone="cyan" />
      <Signal icon={ReceiptText} label="Recent expenses" value={loading ? "…" : `AFN ${money(expenseTotal)}`} detail={t(`${data.expenses.length} latest active records`)} tone="rose" />
      <Signal icon={ArrowRightLeft} label="Awaiting receipt" value={loading ? "…" : awaiting.length} detail="turnovers not yet confirmed" tone="amber" attention={awaiting.length > 0} />
      <Signal icon={BookOpenText} label="Ledger activity" value={loading ? "…" : data.transactions.length} detail="most recent entries" tone="violet" />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
      <CashFlowChart transactions={data.transactions} loading={loading} credits={credits} debits={debits} />
      <WalletDistribution wallets={activeWallets} loading={loading} totalBalance={totalBalance} />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <ExpenseBreakdown expenses={data.expenses} loading={loading} />
      <FinancePulse credits={credits} debits={debits} expenses={expenseTotal} awaiting={awaiting} loading={loading} />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><PanelHeader title="Wallet position" subtitle="Balances by accountable location" action="Manage wallets" onClick={() => go("wallets")} /><div className="divide-y">{loading ? <LoadingBlock /> : !data.wallets.length ? <Empty text="No wallets are available." /> : data.wallets.slice(0, 7).map((wallet) => <button key={wallet.id} type="button" onClick={() => go("wallets")} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-cyan-50/40"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${wallet.is_active ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}><WalletCards className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{wallet.name}</strong><small className="text-slate-500 dark:text-slate-400">{wallet.code} · {wallet.kind_display}</small></span><span className={`text-right text-sm font-semibold tabular-nums ${Number(wallet.balance) < 0 ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-slate-100"}`}>AFN {money(wallet.balance)}</span></button>)}</div></Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><PanelHeader title="Recent ledger activity" subtitle="Credits and debits across every wallet" action="Open ledger" onClick={() => go("transactions")} /><div className="divide-y">{loading ? <LoadingBlock /> : !data.transactions.length ? <Empty text="No ledger entries recorded." /> : data.transactions.slice(0, 7).map((entry) => <button key={entry.id} type="button" onClick={() => go("transactions")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-cyan-50/40"><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${entry.entry_type === "credit" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"}`}>{entry.entry_type === "credit" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{entry.description}</strong><small className="block truncate text-slate-500 dark:text-slate-400">{entry.wallet_name} · {formatDate(entry.transaction_date, true)}</small></span><strong className={entry.entry_type === "credit" ? "text-sm tabular-nums text-emerald-700 dark:text-emerald-300" : "text-sm tabular-nums text-red-700 dark:text-red-300"}>{entry.entry_type === "credit" ? "+" : "−"} AFN {money(entry.amount)}</strong></button>)}</div></Card>
    </div>

    <Card className="mt-5 gap-0 overflow-hidden py-0 shadow-sm"><PanelHeader title="Custody handovers" subtitle="Latest wallet-to-wallet turnover records" action="Open turnovers" onClick={() => go("turnovers")} /><div className="divide-y">{loading ? <LoadingBlock /> : !data.turnovers.length ? <Empty text="No turnovers recorded." /> : data.turnovers.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => go("turnovers")} className="grid w-full gap-2 px-5 py-4 text-left hover:bg-cyan-50/40 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center"><span><strong className="block text-sm text-slate-900 dark:text-slate-100">{item.source_wallet_name} → {item.destination_wallet_name}</strong><small className="text-slate-500 dark:text-slate-400">{formatDate(item.period_start, true)} – {formatDate(item.period_end, true)}</small></span><span><strong className="block text-sm tabular-nums text-slate-800 dark:text-slate-200">AFN {money(item.amount)}</strong><small className="text-slate-500 dark:text-slate-400">by {item.handed_over_by_name}</small></span><StatusBadge status={item.status} /></button>)}</div></Card>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-100 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/40 px-5 py-4"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Continue finance operations</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Post an expense or reconcile a wallet handover.</p></div><div className="flex flex-wrap gap-2"><Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => go("expenses")}><ReceiptText />Post expense</Button><Button variant="outline" onClick={() => go("turnovers")}><ArrowRightLeft />New turnover</Button>{hasRole(user, "administrator") && <Button variant="outline" onClick={() => go("wallets")}><WalletCards />Manage wallets</Button>}</div></div>
  </div>;
}

function ResourcePage({ kind, user, notify }) {
  const { t } = useLanguage();
  const config = resourceConfig[kind];
  const [items, setItems] = useState([]); const [meta, setMeta] = useState({ count: 0 }); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); const [query, setQuery] = useState(""); const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useState({}); const [page, setPage] = useState(1); const [dialog, setDialog] = useState(null); const [selected, setSelected] = useState(null); const [refresh, setRefresh] = useState(0);
  const [lookups, setLookups] = useState({ wallets: [], categories: [] });

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true); setError(null);
      const params = new URLSearchParams({ page: String(page), ordering: kind === "wallets" || kind === "categories" ? "name" : kind === "transactions" ? "-transaction_date" : kind === "expenses" ? "-expense_date" : "-created_at" });
      if (deferredQuery.trim()) params.set("search", deferredQuery.trim());
      Object.entries(filters).forEach(([key, value]) => { if (value !== "" && value != null) params.set(key, value); });
      try {
        const data = await financeApi(`${config.endpoint}/?${params}`);
        if (live) { setItems(rows(data)); setMeta({ count: data?.count ?? rows(data).length, next: data?.next, previous: data?.previous }); }
      } catch (reason) { if (live) setError(reason); } finally { if (live) setLoading(false); }
    }
    load(); return () => { live = false; };
  }, [config.endpoint, deferredQuery, filters, kind, page, refresh]);
  useEffect(() => {
    let live = true;
    Promise.all([financeApi("wallets/?ordering=name&page_size=100"), financeApi("expense-categories/?ordering=name&page_size=100")]).then(([wallets, categories]) => { if (live) setLookups({ wallets: rows(wallets), categories: rows(categories) }); }).catch(() => {});
    return () => { live = false; };
  }, [refresh]);

  const canCreate = Boolean(config.create) && (kind !== "wallets" || hasRole(user, "administrator")) && (kind !== "categories" || hasRole(user, "administrator", "finance"));
  function open(mode, item = null) { setSelected(item); setDialog(mode); }
  function saved(message) { setDialog(null); setSelected(null); notify(message); setRefresh((value) => value + 1); }

  return <div>
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-700 dark:text-cyan-300">Finance register</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{config.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{config.subtitle}</p></div>{canCreate && <Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => open("create")}><Plus />{config.create}</Button>}</div>

    <Card className="gap-0 overflow-hidden py-0 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><Input className="bg-white dark:bg-slate-900 pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={config.search} aria-label={`Search ${config.title}`} /></div>
        <ResourceFilters kind={kind} filters={filters} setFilters={(value) => { setFilters(value); setPage(1); }} lookups={lookups} />
        <Button variant="outline" size="icon" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh records"><RefreshCw className={loading ? "animate-spin" : ""} /></Button>
      </div>
      {error ? <div className="p-5"><ErrorBox error={error} retry={() => setRefresh((value) => value + 1)} /></div> : loading ? <LoadingBlock /> : !items.length ? <Empty text={`No ${config.title.toLowerCase()} match the current view.`} /> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead><tr className="border-b bg-white dark:bg-slate-900 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">{config.columns.map((column) => <th key={column} className="px-5 py-3.5">{column}</th>)}<th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody>{items.map((item) => <ResourceRow key={item.id} kind={kind} item={item} user={user} open={(mode) => open(mode, item)} />)}</tbody></table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3"><p className="text-xs text-slate-500 dark:text-slate-400">{t(`${meta.count} total records`)}</p><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={!meta.previous || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="min-w-16 text-center text-xs font-medium text-slate-600 dark:text-slate-300">{t(`Page ${page}`)}</span><Button size="sm" variant="outline" disabled={!meta.next || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </Card>

    {dialog && <DialogRouter kind={kind} mode={dialog} item={selected} user={user} lookups={lookups} close={() => { setDialog(null); setSelected(null); }} saved={saved} />}
  </div>;
}

function ResourceFilters({ kind, filters, setFilters, lookups }) {
  const set = (key, value) => setFilters({ ...filters, [key]: value });
  if (kind === "wallets") return <><Select className="lg:w-44" value={filters.kind || ""} onChange={(v) => set("kind", v)} placeholder="All wallet types" options={[["reception", "Reception"], ["pharmacy", "Pharmacy"], ["manager", "Manager"], ["custom", "Custom"]]} /><Select className="lg:w-36" value={filters.is_active || ""} onChange={(v) => set("is_active", v)} placeholder="Any status" options={[["true", "Active"], ["false", "Inactive"]]} /></>;
  if (kind === "transactions") return <><Select className="lg:w-44" value={filters.wallet || ""} onChange={(v) => set("wallet", v)} placeholder="All wallets" options={lookups.wallets.map((x) => [x.id, x.name])} /><Select className="lg:w-32" value={filters.entry_type || ""} onChange={(v) => set("entry_type", v)} placeholder="Any entry" options={[["credit", "Credit"], ["debit", "Debit"]]} /><Select className="lg:w-44" value={filters.category || ""} onChange={(v) => set("category", v)} placeholder="Any category" options={transactionCategories} /><DateFilters filters={filters} set={set} /></>;
  if (kind === "expenses") return <><Select className="lg:w-44" value={filters.category || ""} onChange={(v) => set("category", v)} placeholder="All categories" options={lookups.categories.map((x) => [x.id, x.name])} /><Select className="lg:w-44" value={filters.wallet || ""} onChange={(v) => set("wallet", v)} placeholder="All wallets" options={lookups.wallets.map((x) => [x.id, x.name])} /><Select className="lg:w-36" value={filters.is_void || ""} onChange={(v) => set("is_void", v)} placeholder="Any status" options={[["false", "Active"], ["true", "Void"]]} /><DateFilters filters={filters} set={set} /></>;
  if (kind === "turnovers") return <><Select className="lg:w-40" value={filters.source_wallet || ""} onChange={(v) => set("source_wallet", v)} placeholder="Any source" options={lookups.wallets.map((x) => [x.id, x.name])} /><Select className="lg:w-40" value={filters.destination_wallet || ""} onChange={(v) => set("destination_wallet", v)} placeholder="Any destination" options={lookups.wallets.map((x) => [x.id, x.name])} /><Select className="lg:w-40" value={filters.status || ""} onChange={(v) => set("status", v)} placeholder="Any status" options={[["handed_over", "Handed over"], ["received", "Received"]]} /><DateFilters filters={filters} set={set} /></>;
  if (kind === "categories") return null;
  return null;
}

function DateFilters({ filters, set }) { return <div className="flex gap-2"><DatePicker className="w-36 bg-white dark:bg-slate-900" value={filters.start || ""} onChange={(value) => set("start", value)} placeholder="Start date" /><DatePicker className="w-36 bg-white dark:bg-slate-900" value={filters.end || ""} onChange={(value) => set("end", value)} placeholder="End date" /></div>; }

const transactionCategories = [
  ["reception_income", "Reception income"], ["reception_refund", "Reception refund"],
  ["pharmacy_purchase", "Pharmacy purchase"], ["pharmacy_sale", "Pharmacy sale"],
  ["supplier_payment", "Supplier payment"], ["purchase_reversal", "Purchase reversal"],
  ["sale_reversal", "Sale reversal"], ["supplier_payment_reversal", "Payment reversal"],
  ["expense", "Expense"], ["expense_reversal", "Expense reversal"], ["turnover", "Turnover"],
];

function ResourceRow({ kind, item, user, open }) {
  const cells = useMemo(() => rowCells(kind, item), [kind, item]);
  const canView = ["transactions", "expenses", "turnovers"].includes(kind);
  const canEdit = (kind === "wallets" && hasRole(user, "administrator")) || (kind === "categories" && hasRole(user, "administrator", "finance"));
  const canDelete = (kind === "wallets" && hasRole(user, "administrator") && item.kind === "custom") || (kind === "categories" && hasRole(user, "administrator", "finance"));
  const canVoid = kind === "expenses" && !item.is_void && hasRole(user, "administrator", "finance");
  const canReceive = kind === "turnovers" && item.status === "handed_over";
  const hasActions = canView || canEdit || canDelete || canVoid || canReceive;
  return <tr className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-cyan-50/40">{cells.map((cell, index) => <td key={index} className="px-5 py-4 align-middle text-slate-700 dark:text-slate-300">{cell}</td>)}<td className="px-5 py-4 text-right">{hasActions && <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Open row actions" title="Actions" className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900" />}><MoreHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44 p-1.5">{canView && <DropdownMenuItem onClick={() => open("detail")}><Eye />View details</DropdownMenuItem>}{canEdit && <DropdownMenuItem onClick={() => open("edit")}><Pencil />Edit</DropdownMenuItem>}{canReceive && <DropdownMenuItem onClick={() => open("receive")}><CheckCircle2 />Confirm receipt</DropdownMenuItem>}{(canDelete || canVoid) && <DropdownMenuSeparator />}{canVoid && <DropdownMenuItem variant="destructive" onClick={() => open("void")}><Undo2 />Void expense</DropdownMenuItem>}{canDelete && <DropdownMenuItem variant="destructive" onClick={() => open("delete")}><Trash2 />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}</td></tr>;
}

function rowCells(kind, item) {
  if (kind === "wallets") return [<Name key="name" main={item.name} sub={item.code} />, item.kind_display, <Money key="balance" value={item.balance} negative />, item.allow_negative ? "Allowed" : "Blocked", <StateBadge key="state" active={item.is_active} />];
  if (kind === "transactions") return [<Name key="reference" main={item.reference} sub={item.description} />, formatDate(item.transaction_date, true), item.wallet_name, item.category_display, <span key="amount" className={`font-semibold tabular-nums ${item.entry_type === "credit" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{item.entry_type === "credit" ? "+" : "−"} AFN {money(item.amount)}</span>, <Money key="balance" value={item.balance_after} negative />];
  if (kind === "expenses") return [<Name key="expense" main={item.purpose} sub={item.payee || item.receipt_number || "No payee"} />, formatDate(item.expense_date), item.category_name, item.wallet_name, <Money key="amount" value={item.amount} />, <StatusBadge key="status" status={item.is_void ? "void" : "posted"} />];
  if (kind === "turnovers") return [<Name key="route" main={`${item.source_wallet_name} → ${item.destination_wallet_name}`} sub={item.notes} />, <Name key="period" main={formatDate(item.period_start, true)} sub={`to ${formatDate(item.period_end, true)}`} />, <Money key="amount" value={item.amount} />, item.handed_over_by_name, formatDate(item.created_at, true), <StatusBadge key="status" status={item.status} />];
  return [<Name key="category" main={item.name} />, item.description || "—", <StateBadge key="state" active={item.is_active} />, formatDate(item.updated_at, true)];
}

function DialogRouter({ kind, mode, item, lookups, close, saved }) {
  if (mode === "create" && kind === "wallets") return <WalletForm onClose={close} onSaved={saved} />;
  if (mode === "edit" && kind === "wallets") return <WalletForm item={item} onClose={close} onSaved={saved} />;
  if (mode === "create" && kind === "categories") return <CategoryForm onClose={close} onSaved={saved} />;
  if (mode === "edit" && kind === "categories") return <CategoryForm item={item} onClose={close} onSaved={saved} />;
  if (mode === "create" && kind === "expenses") return <ExpenseForm wallets={lookups.wallets} categories={lookups.categories} onClose={close} onSaved={saved} />;
  if (mode === "create" && kind === "turnovers") return <TurnoverForm wallets={lookups.wallets} onClose={close} onSaved={saved} />;
  if (mode === "void") return <VoidExpenseForm item={item} onClose={close} onSaved={saved} />;
  if (mode === "receive") return <ConfirmAction kind="receive" item={item} onClose={close} onSaved={saved} />;
  if (mode === "delete") return <ConfirmAction kind={kind === "wallets" ? "delete-wallet" : "delete-category"} item={item} onClose={close} onSaved={saved} />;
  return <FinanceDetail kind={kind} item={item} onClose={close} />;
}

function CashFlowChart({ transactions, loading, credits, debits }) {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : `${language}-AF`;
  const days = useMemo(() => {
    const result = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      result.push({ key, label: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date), credit: 0, debit: 0 });
    }
    const indexed = new Map(result.map((day) => [day.key, day]));
    transactions.forEach((item) => {
      const date = new Date(item.transaction_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const day = indexed.get(key);
      if (day) day[item.entry_type] += Number(item.amount || 0);
    });
    return result;
  }, [locale, transactions]);
  const max = Math.max(1, ...days.flatMap((day) => [day.credit, day.debit]));
  const plot = { left: 62, top: 20, width: 628, height: 180 };
  const group = plot.width / days.length; const barWidth = Math.min(13, group * .3);
  const compact = (value) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return <Card className="gap-0 overflow-hidden py-0 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">Cash-flow rhythm</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Daily credits and debits · last 14 days</p></div><div className="flex gap-4 text-xs font-medium"><span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><i className="size-2.5 rounded-sm bg-emerald-500" />Credits</span><span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><i className="size-2.5 rounded-sm bg-rose-400" />Debits</span></div></div>
    <div className="px-4 pb-3 pt-4">
      {loading ? <LoadingBlock /> : <svg viewBox="0 0 720 240" className="h-auto w-full" role="img" aria-labelledby="cash-flow-title cash-flow-description"><title id="cash-flow-title">Fourteen day cash flow</title><desc id="cash-flow-description">Grouped bars compare daily wallet credits and debits in Afghanis.</desc>
        {[0, .25, .5, .75, 1].map((ratio) => { const y = plot.top + plot.height - ratio * plot.height; return <g key={ratio}><line x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" /><text x={plot.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{compact(max * ratio)}</text></g>; })}
        {days.map((day, index) => { const x = plot.left + index * group + group / 2; const creditHeight = day.credit / max * plot.height; const debitHeight = day.debit / max * plot.height; return <g key={day.key}><rect x={x - barWidth - 1} y={plot.top + plot.height - creditHeight} width={barWidth} height={creditHeight} rx="3" fill="#10b981"><title>{day.label}: AFN {money(day.credit)} credited</title></rect><rect x={x + 1} y={plot.top + plot.height - debitHeight} width={barWidth} height={debitHeight} rx="3" fill="#fb7185"><title>{day.label}: AFN {money(day.debit)} debited</title></rect>{index % 2 === 0 && <text x={x} y={plot.top + plot.height + 20} textAnchor="middle" fontSize="10" fill="#64748b">{day.label}</text>}</g>; })}
        <text x="14" y="112" transform="rotate(-90 14 112)" textAnchor="middle" fontSize="10" fill="#64748b">Amount (AFN)</text>
      </svg>}
    </div>
    <div className="grid grid-cols-3 border-t bg-slate-50/40 dark:bg-slate-900/40"><ChartMetric label="30-day credits" value={`AFN ${money(credits)}`} tone="text-emerald-700 dark:text-emerald-300" /><ChartMetric label="30-day debits" value={`AFN ${money(debits)}`} tone="text-rose-700 dark:text-rose-300" /><ChartMetric label="Net movement" value={`AFN ${money(credits - debits)}`} tone={credits - debits >= 0 ? "text-cyan-700 dark:text-cyan-300" : "text-red-700 dark:text-red-300"} /></div>
  </Card>;
}

function WalletDistribution({ wallets, loading, totalBalance }) {
  const colors = ["#0891b2", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#64748b"];
  const values = wallets.map((wallet) => ({ ...wallet, magnitude: Math.abs(Number(wallet.balance || 0)) })).sort((a, b) => b.magnitude - a.magnitude);
  const visible = values.slice(0, 5); const remainder = values.slice(5).reduce((sum, item) => sum + item.magnitude, 0);
  if (remainder) visible.push({ id: "other", name: "Other wallets", magnitude: remainder });
  const totalMagnitude = visible.reduce((sum, item) => sum + item.magnitude, 0); const circumference = 2 * Math.PI * 48;
  const segments = visible.map((item, index) => {
    const length = totalMagnitude ? item.magnitude / totalMagnitude * circumference : 0;
    const previousMagnitude = visible.slice(0, index).reduce((sum, previous) => sum + previous.magnitude, 0);
    const offset = totalMagnitude ? previousMagnitude / totalMagnitude * circumference : 0;
    return { ...item, color: colors[index], length, offset };
  });
  return <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Wallet distribution</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Share of absolute balance by wallet</p></div>{loading ? <LoadingBlock /> : !totalMagnitude ? <Empty text="Wallet balances are currently zero." /> : <div className="grid items-center gap-3 p-5 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]"><div className="relative mx-auto size-36"><svg viewBox="0 0 120 120" className="size-36 -rotate-90" role="img" aria-label="Wallet balance distribution"><circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="13" />{segments.map((segment) => <circle key={segment.id} cx="60" cy="60" r="48" fill="none" stroke={segment.color} strokeWidth="13" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset} strokeLinecap="butt"><title>{segment.name}: AFN {money(segment.magnitude)}</title></circle>)}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Net total</span><strong className={`mt-1 text-sm tabular-nums ${totalBalance < 0 ? "text-red-700 dark:text-red-300" : "text-slate-950 dark:text-slate-50"}`}>AFN {compactMoney(totalBalance)}</strong></div></div><div className="space-y-2.5">{segments.map((segment) => <div key={segment.id} className="flex items-center gap-2 text-xs"><span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} /><span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{segment.name}</span><strong className="tabular-nums text-slate-900 dark:text-slate-100">{totalMagnitude ? Math.round(segment.magnitude / totalMagnitude * 100) : 0}%</strong></div>)}</div></div>}</Card>;
}

function ExpenseBreakdown({ expenses, loading }) {
  const grouped = useMemo(() => {
    const result = new Map();
    expenses.forEach((expense) => result.set(expense.category_name, (result.get(expense.category_name) || 0) + Number(expense.amount || 0)));
    return [...result.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [expenses]);
  const max = Math.max(1, ...grouped.map((item) => item.amount)); const total = grouped.reduce((sum, item) => sum + item.amount, 0);
  return <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Expense composition</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Largest spending categories · last 30 days</p></div>{loading ? <LoadingBlock /> : !grouped.length ? <Empty text="No active expenses in this period." /> : <div className="space-y-4 p-5">{grouped.map((item, index) => <div key={item.name}><div className="mb-1.5 flex items-end justify-between gap-3"><span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{item.name}</span><span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">AFN {money(item.amount)} <small className="font-normal text-slate-400 dark:text-slate-500">· {Math.round(item.amount / total * 100)}%</small></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${index === 0 ? "bg-cyan-600" : "bg-cyan-400"}`} style={{ width: `${Math.max(3, item.amount / max * 100)}%`, opacity: Math.max(.45, 1 - index * .1) }} /></div></div>)}</div>}</Card>;
}

function FinancePulse({ credits, debits, expenses, awaiting, loading }) {
  const net = credits - debits; const awaitingTotal = awaiting.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseShare = debits > 0 ? Math.min(100, expenses / debits * 100) : 0;
  const inflowCoverage = debits > 0 ? Math.min(100, credits / debits * 100) : credits > 0 ? 100 : 0;
  return <Card className="relative gap-0 overflow-hidden border-cyan-900 bg-gradient-to-br from-[#083344] via-[#0e5d6e] to-[#0f7181] py-0 text-white shadow-sm"><div className="absolute -right-16 -top-16 size-52 rounded-full bg-cyan-300/10" /><div className="relative border-b border-white/10 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-cyan-200">30-day finance pulse</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-semibold">{loading ? "Reviewing cash position…" : net >= 0 ? "Positive net cash movement" : "Outflow exceeds inflow"}</h3><p className="mt-1 text-xs text-cyan-100/75">An at-a-glance view of liquidity and custody exposure.</p></div><strong className={`text-2xl tabular-nums ${net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{net >= 0 ? "+" : "−"} AFN {money(Math.abs(net))}</strong></div></div><div className="relative grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><PulseStat label="Inflow coverage" value={`${Math.round(inflowCoverage)}%`} detail="credits vs. all debits" progress={inflowCoverage} /><PulseStat label="Expense share" value={`${Math.round(expenseShare)}%`} detail="of debit movement" progress={expenseShare} /><PulseStat label="Pending custody" value={`AFN ${compactMoney(awaitingTotal)}`} detail={`${awaiting.length} handovers awaiting receipt`} progress={awaiting.length ? 100 : 0} warning={awaiting.length > 0} /></div></Card>;
}

function PulseStat({ label, value, detail, progress, warning }) { return <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/70">{label}</p><p className={`mt-1 text-xl font-semibold tabular-nums ${warning ? "text-amber-300" : "text-white"}`}>{value}</p><p className="mt-1 text-xs text-cyan-100/65">{detail}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${warning ? "bg-amber-300" : "bg-cyan-300"}`} style={{ width: `${progress}%` }} /></div></div>; }
function ChartMetric({ label, value, tone }) { return <div className="border-r px-4 py-3 last:border-r-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p><p className={`mt-1 truncate text-xs font-semibold tabular-nums sm:text-sm ${tone}`}>{value}</p></div>; }
function compactMoney(value) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0)); }

function Signal({ icon: Icon, label, value, detail, tone, attention }) { const styles = { cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 ring-cyan-100", rose: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-100", amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-100", violet: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-100" }; return <div className="border-b p-5 last:border-b-0 sm:nth-[2]:border-b-0 sm:nth-[odd]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"><div className="flex items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${styles[tone]}`}><Icon className="size-5" /></span><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">{label}</p>{attention && <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />}</div><p className="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</p><p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p></div></div></div>; }
function PanelHeader({ title, subtitle, action, onClick }) { return <div className="flex items-center justify-between gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p></div><Button size="sm" variant="ghost" className="text-cyan-700 dark:text-cyan-300" onClick={onClick}>{action}<ArrowUpRight /></Button></div>; }
function Empty({ text }) { return <div className="px-5 py-14 text-center"><Banknote className="mx-auto size-7 text-slate-300" /><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{text}</p></div>; }
function Name({ main, sub }) { return <span className="block min-w-0"><strong className="block max-w-72 truncate font-medium text-slate-900 dark:text-slate-100">{main}</strong>{sub && <small className="block max-w-72 truncate text-slate-500 dark:text-slate-400">{sub}</small>}</span>; }
function Money({ value, negative = false }) { const below = Number(value) < 0; return <span className={`font-semibold tabular-nums ${negative && below ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-slate-100"}`}>AFN {money(value)}</span>; }
function StateBadge({ active }) { return <Badge variant="secondary" className={active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}>{active ? "Active" : "Inactive"}</Badge>; }
function StatusBadge({ status }) { const style = status === "received" || status === "posted" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : status === "void" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"; return <Badge variant="secondary" className={style}>{String(status).replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase())}</Badge>; }
