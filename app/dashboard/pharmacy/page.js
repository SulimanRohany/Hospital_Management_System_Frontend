"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, Banknote, Ban, Boxes, Building2, ChartNoAxesCombined, ClipboardList, CreditCard, Eye, History, LoaderCircle, MoreHorizontal, PackageCheck, PackagePlus, Pencil, Pill, Plus, RefreshCw, Search, ShoppingCart, Trash2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { api, errorSummary, formatDate, Modal, money, PHARMACY_ROLES, qty, rows, Select, WRITE_ROLES } from "@/components/pharmacy-ui";
import { CategoryForm, MedicineForm, PaymentForm, PurchaseForm, SaleForm, SimpleEntityForm, StockAdjustmentForm, TransactionDetail, VoidForm } from "@/components/pharmacy-forms";
import { hasRole, withSectionRole } from "@/lib/roles";

const tabs = [
  ["overview", "Overview", ChartNoAxesCombined], ["sales", "Sales", ShoppingCart], ["purchases", "Purchases", PackagePlus],
  ["medicines", "Medicines", Pill], ["batches", "Batches", Boxes], ["movements", "Stock movements", History],
  ["suppliers", "Suppliers", Building2], ["payments", "Supplier payments", CreditCard], ["categories", "Categories", ClipboardList],
];

export default function PharmacyPage() {
  const { user: account } = useAuth();
  const user = withSectionRole(account, "pharmacy");
  const [tab, setTab] = useState("overview");
  const [notice, setNotice] = useState("");

  if (!hasRole(user, ...PHARMACY_ROLES)) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertDescription>You do not have access to pharmacy operations.</AlertDescription>
      </Alert>
    );
  }

  const financeView = hasRole(user, "finance") && !hasRole(user, "administrator");
  const visibleTabs = financeView
    ? tabs.filter(([key]) => ["overview", "sales", "purchases", "suppliers", "payments"].includes(key))
    : tabs;

  return (
    <div className="pharmacy-section min-w-0 max-w-full overflow-x-clip">
      <div className="mb-7 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:px-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
          Medication and inventory operations
        </p>
        <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Pharmacy</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Sales, purchasing, batch stock, suppliers and payments in one audited workspace.
        </p>
      </div>

      {notice && (
        <Alert className="mb-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            {notice}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-7 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-sm" role="tablist" aria-label="Pharmacy sections">
        {visibleTabs.map(([key, label, Icon]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "border-cyan-700 bg-cyan-700 shadow-sm hover:bg-cyan-800" : "border-transparent bg-transparent text-slate-600 dark:text-slate-300 shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"}
            onClick={() => setTab(key)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>

      {tab === "overview"
        ? <PharmacyWorkbench user={user} go={setTab} />
        : <ResourcePage kind={tab} user={user} notify={setNotice} />
      }
    </div>
  );
}

function PharmacyWorkbench({ user, go }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const hasSummary = hasRole(user, "administrator", "manager", "finance");
  const financeView = hasRole(user, "finance") && !hasRole(user, "administrator");

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const requests = [api("sales/?ordering=-sale_date&page_size=8"), api("purchases/?outstanding=true&ordering=-purchase_date&page_size=6")];
        if (!financeView) requests.push(api("medicines/low-stock/?page_size=8"), api("medicine-batches/near-expiry/?days=90&page_size=8"));
        if (hasSummary) requests.push(api("medicines/inventory-summary/"), api("sales/summary/"));
        const results = await Promise.all(requests);
        if (!live) return;
        let index = 0; const next = { salesList: results[index++], purchases: results[index++] };
        if (!financeView) { next.low = results[index++]; next.expiry = results[index++]; }
        if (hasSummary) { next.inventory = results[index++]; next.salesSummary = results[index++]; }
        setData(next);
      } catch (reason) { if (live) setError(errorSummary(reason)); }
      finally { if (live) setLoading(false); }
    }
    load(); return () => { live = false; };
  }, [financeView, hasSummary, refresh]);

  const sales = rows(data.salesList); const purchases = rows(data.purchases); const low = rows(data.low); const expiry = rows(data.expiry);
  const postedSales = sales.filter((sale) => sale.status !== "void");
  const recentRevenue = postedSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const outstanding = purchases.reduce((sum, purchase) => sum + Number(purchase.amount_due || 0), 0);
  if (error) return <ErrorBox message={error} retry={() => setRefresh((value) => value + 1)} />;

  return <div>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300"><Pill className="size-4" /></span><span className="text-xs font-bold uppercase tracking-[.15em] text-cyan-700 dark:text-cyan-300">Dispensary workspace</span></div><h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Pharmacy operations</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dispensing, stock safety, expiry control, and supplier obligations.</p></div><Button variant="outline" size="icon" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh pharmacy overview"><RefreshCw className={loading ? "animate-spin" : ""} /></Button></div>

    <div className="grid overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm md:grid-cols-4">
      <PharmacySignal icon={ShoppingCart} label="Recent dispensing" value={postedSales.length} detail={`AFN ${money(recentRevenue)} posted`} tone="cyan" />
      <PharmacySignal icon={TriangleAlert} label="Reorder queue" value={financeView ? "—" : low.length} detail={financeView ? "Managed by pharmacy" : "medicines at threshold"} tone="amber" attention={low.length > 0} />
      <PharmacySignal icon={Boxes} label="Expiry watch" value={financeView ? "—" : expiry.length} detail={financeView ? "Managed by pharmacy" : "batches within 90 days"} tone="orange" attention={expiry.length > 0} />
      <PharmacySignal icon={CreditCard} label="Supplier liability" value={`AFN ${money(outstanding)}`} detail={`${purchases.length} outstanding purchases`} tone="violet" />
    </div>

    {!financeView && <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><PharmacyPanelHeader title="Stock intervention queue" subtitle="Medicines requiring replenishment or expiry action" action="Open inventory" onClick={() => go("medicines")} /><div className="grid md:grid-cols-2 md:divide-x"><div><div className="flex items-center justify-between border-b bg-amber-50/40 dark:bg-amber-950/40 px-5 py-3"><span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Reorder required</span><Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">{low.length}</Badge></div><div className="divide-y">{loading ? <QueueLoading /> : !low.length ? <QueueClear text="Stock levels are healthy." /> : low.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => go("medicines")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-amber-50/40"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"><Pill className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{item.name}</strong><small className="text-slate-500 dark:text-slate-400">{item.code} · reorder at {qty(item.reorder_level)}</small></span><span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">{qty(item.stock_quantity)}</span></button>)}</div></div><div><div className="flex items-center justify-between border-b bg-orange-50/40 dark:bg-orange-950/40 px-5 py-3"><span className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">Expiry watch</span><Badge className="bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300">{expiry.length}</Badge></div><div className="divide-y">{loading ? <QueueLoading /> : !expiry.length ? <QueueClear text="No batches expire within 90 days." /> : expiry.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => go("batches")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-orange-50/40"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"><Boxes className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{item.medicine_name}</strong><small className="text-slate-500 dark:text-slate-400">{item.batch_number} · {formatDate(item.expiry_date, false, language)}</small></span><span className="text-sm font-bold tabular-nums text-orange-700 dark:text-orange-300">{qty(item.quantity_available)}</span></button>)}</div></div></div></Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-sm"><PharmacyPanelHeader title="Dispensing activity" subtitle="Most recent posted and voided sales" action="Open sales" onClick={() => go("sales")} /><div className="divide-y">{loading ? <QueueLoading /> : !sales.length ? <QueueClear text="No pharmacy sales recorded." /> : sales.slice(0, 7).map((sale) => <button key={sale.id} type="button" onClick={() => go("sales")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-cyan-50/40"><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${sale.status === "void" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}><ShoppingCart className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-slate-100">{sale.sale_number}</strong><small className="block truncate text-slate-500 dark:text-slate-400">{sale.patient_name || t("Walk-in sale")} · {formatDate(sale.sale_date, false, language)}</small></span><span className="text-right"><strong className="block text-sm tabular-nums">AFN {money(sale.total_amount)}</strong><small className={sale.status === "void" ? "text-red-600 dark:text-red-300" : "text-emerald-600 dark:text-emerald-300"}>{t(sale.status === "void" ? "Void" : "Posted")}</small></span></button>)}</div></Card>
    </div>}

    {financeView && <div className="mt-5 grid gap-5 lg:grid-cols-3"><PharmacyFinanceCard label="Inventory at cost" value={`AFN ${money(data.inventory?.inventory_cost_value)}`} detail={`${data.inventory?.medicine_count || 0} active medicines`} icon={Boxes} /><PharmacyFinanceCard label="Sales revenue" value={`AFN ${money(data.salesSummary?.revenue)}`} detail="Posted pharmacy sales" icon={Banknote} /><PharmacyFinanceCard label="Outstanding suppliers" value={`AFN ${money(outstanding)}`} detail={`${purchases.length} purchases awaiting payment`} icon={Building2} /></div>}

    <Card className="mt-5 gap-0 overflow-hidden py-0 shadow-sm"><div className="flex items-center justify-between border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">Purchasing and replenishment</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Outstanding stock receipts and supplier balances</p></div><Button size="sm" variant="ghost" className="text-cyan-700 dark:text-cyan-300" onClick={() => go("purchases")}>View purchases <ArrowUpRight /></Button></div><div className="divide-y">{loading ? <QueueLoading /> : !purchases.length ? <QueueClear text="No outstanding pharmacy purchases." /> : purchases.slice(0, 5).map((purchase) => <button key={purchase.id} type="button" onClick={() => go("purchases")} className="grid w-full gap-2 px-5 py-4 text-left hover:bg-cyan-50/40 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><span><strong className="block text-sm text-slate-900 dark:text-slate-100">{purchase.purchase_number}</strong><small className="text-slate-500 dark:text-slate-400">{formatDate(purchase.purchase_date)}</small></span><span><strong className="block text-sm font-medium text-slate-700 dark:text-slate-300">{purchase.supplier_name}</strong><small className="text-slate-500 dark:text-slate-400">Invoice {purchase.invoice_number || "—"}</small></span><span className="text-right"><strong className="block text-sm tabular-nums text-red-700 dark:text-red-300">AFN {money(purchase.amount_due)}</strong><small className="text-slate-500 dark:text-slate-400">amount due</small></span></button>)}</div></Card>

    {hasRole(user, ...WRITE_ROLES) && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-100 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/40 px-5 py-4"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Continue pharmacy operations</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Dispense medication, receive inventory, or correct batch stock.</p></div><div className="flex flex-wrap gap-2"><Button className="bg-cyan-700 hover:bg-cyan-800" onClick={() => go("sales")}><ShoppingCart />New sale</Button><Button variant="outline" onClick={() => go("purchases")}><PackagePlus />Receive stock</Button><Button variant="outline" onClick={() => go("movements")}><PackageCheck />Adjust stock</Button></div></div>}
  </div>;
}

function PharmacySignal({ icon: Icon, label, value, detail, tone, attention }) { const { t } = useLanguage(); const translatedValue = typeof value === "string" ? t(value) : value; const styles = { cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 ring-cyan-100", amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-100", orange: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ring-orange-100", violet: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-100" }; return <div className="border-b p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="flex items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${styles[tone]}`}><Icon className="size-5" /></span><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">{t(label)}</p>{attention && <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />}</div><p className="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-slate-50">{translatedValue}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t(detail)}</p></div></div></div>; }
function PharmacyPanelHeader({ title, subtitle, action, onClick }) { const { t } = useLanguage(); return <div className="flex items-center justify-between gap-3 border-b bg-slate-50/60 dark:bg-slate-900/60 px-5 py-4"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{t(title)}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t(subtitle)}</p></div><Button size="sm" variant="ghost" className="text-cyan-700 dark:text-cyan-300" onClick={onClick}>{t(action)}<ArrowUpRight /></Button></div>; }
function PharmacyFinanceCard({ label, value, detail, icon: Icon }) { const { t } = useLanguage(); return <Card className="p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"><Icon className="size-5" /></span><div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(label)}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{t(value)}</p></div></div><p className="mt-4 border-t pt-3 text-xs text-slate-500 dark:text-slate-400">{t(detail)}</p></Card>; }
function QueueLoading() { const { t } = useLanguage(); return <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400"><LoaderCircle className="mx-auto mb-2 animate-spin" />{t("Loading pharmacy data…")}</div>; }
function QueueClear({ text }) { const { t } = useLanguage(); return <div className="px-5 py-10 text-center"><PackageCheck className="mx-auto size-7 text-emerald-500" /><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(text)}</p></div>; }

function Overview({ user, go }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      
      try {
        if (hasRole(user, "finance")) {
          const [inventory, sales] = await Promise.all([
            api("medicines/inventory-summary/"),
            api("sales/summary/")
          ]);
          setData({ inventory, sales });
        } else {
          const requests = [
            api("medicines/low-stock/?page_size=5"),
            api("medicine-batches/near-expiry/?days=90&page_size=5")
          ];
          
          if (hasRole(user, "administrator", "manager")) {
            requests.push(
              api("medicines/inventory-summary/"),
              api("sales/summary/")
            );
          }
          
          const [low, expiry, inventory, sales] = await Promise.all(requests);
          setData({ low, expiry, inventory, sales });
        }
      } catch (e) {
        setError(errorSummary(e));
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [user]);

  const cards = hasRole(user, "finance")
    ? [
        ["Active medicines", data.inventory?.medicine_count ?? 0, Pill, "cyan"],
        ["Usable quantity", qty(data.inventory?.usable_quantity), Boxes, "cyan"],
        ["Inventory cost (AFN)", money(data.inventory?.inventory_cost_value), Banknote, "amber"],
        ["Sales revenue (AFN)", money(data.sales?.revenue), Banknote, "emerald"],
      ]
    : [
        ["Low-stock medicines", data.low?.count ?? rows(data.low).length, TriangleAlert, "amber"],
        ["Near-expiry batches", data.expiry?.count ?? rows(data.expiry).length, Boxes, "orange"],
        ["Usable quantity", data.inventory ? qty(data.inventory.usable_quantity) : "Restricted", Pill, "cyan"],
        ["Sales revenue (AFN)", data.sales ? money(data.sales.revenue) : "Restricted", Banknote, "emerald"],
      ];

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      {error && <ErrorBox message={error} retry={() => window.location.reload()} />}
      
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, tone]) => (
          <Summary
            key={label}
            label={label}
            value={loading ? "…" : value}
            icon={Icon}
            tone={tone}
          />
        ))}
      </div>

      {!hasRole(user, "finance") && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="gap-0 overflow-hidden py-0">
            <PanelTitle
              title="Low stock"
              subtitle="Usable stock at or below reorder level"
              action={() => go("medicines")}
            />
            <MiniList
              items={rows(data.low)}
              empty="No low-stock medicines."
              render={(item) => (
                <>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.code} · reorder at {qty(item.reorder_level)}
                    </small>
                  </span>
                  <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" variant="secondary">
                    {qty(item.stock_quantity)}
                  </Badge>
                </>
              )}
            />
          </Card>
          
          <Card className="gap-0 overflow-hidden py-0">
            <PanelTitle
              title="Expiring soon"
              subtitle="Batches expiring within 90 days"
              action={() => go("batches")}
            />
            <MiniList
              items={rows(data.expiry)}
              empty="No batches expire soon."
              render={(item) => (
                <>
                  <span>
                    <strong>{item.medicine_name}</strong>
                    <small>
                      {item.batch_number} · {formatDate(item.expiry_date)}
                    </small>
                  </span>
                  <Badge className="bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300" variant="secondary">
                    {qty(item.quantity_available)}
                  </Badge>
                </>
              )}
            />
          </Card>
        </div>
      )}

      {hasRole(user, ...WRITE_ROLES) && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => go("sales")} className="bg-cyan-700">
            <ShoppingCart /> Open sales
          </Button>
          <Button variant="outline" onClick={() => go("purchases")}>
            <PackagePlus /> Record purchase
          </Button>
        </div>
      )}
    </div>
  );
}

const config = {
  sales: {
    endpoint: "sales",
    title: "Sales",
    search: "Sale number or patient",
    filters: [
      ["status", "Any status", [["posted", "Posted"], ["void", "Void"]]],
      ["prescription", "All sales", [["true", "Prescription only"]]]
    ],
    columns: ["Sale / patient", "Date", "Subtotal", "Discount", "Total", "Status"],
    create: "New sale"
  },
  purchases: {
    endpoint: "purchases",
    title: "Purchases",
    search: "Purchase, invoice or supplier",
    filters: [
      ["status", "Any status", [["posted", "Posted"], ["void", "Void"]]],
      ["outstanding", "All purchases", [["true", "Outstanding only"]]]
    ],
    columns: ["Purchase / supplier", "Date", "Invoice", "Total", "Amount due", "Status"],
    create: "Record purchase"
  },
  medicines: {
    endpoint: "medicines",
    title: "Medicines",
    search: "Code, name, generic or strength",
    filters: [["mode", "All medicines", [["low", "Low stock"]]]],
    columns: ["Medicine", "Category", "Form / unit", "Usable stock", "Reorder level", "Status"],
    create: "New medicine"
  },
  batches: {
    endpoint: "medicine-batches",
    title: "Batch inventory",
    search: "Batch, medicine or supplier",
    filters: [
      ["expired", "Any expiry", [["false", "Unexpired"], ["true", "Expired"]]],
      ["in_stock", "Any stock", [["true", "In stock"]]],
      ["active", "Any state", [["true", "Active"], ["false", "Inactive"]]]
    ],
    columns: ["Medicine / batch", "Supplier", "Expiry", "Received", "Available", "State"]
  },
  movements: {
    endpoint: "stock-movements",
    title: "Stock movements",
    search: "Reference, reason, batch or medicine",
    filters: [["movement_type", "Any movement", [
      ["purchase", "Purchase"],
      ["sale", "Sale"],
      ["adjustment_in", "Adjustment in"],
      ["adjustment_out", "Adjustment out"],
      ["void", "Void / reversal"]
    ]]],
    columns: ["Medicine / batch", "Date", "Movement", "Change", "Balance", "Reference"],
    create: "Stock adjustment"
  },
  suppliers: {
    endpoint: "suppliers",
    title: "Suppliers",
    search: "Name, contact, phone or email",
    filters: [],
    columns: ["Supplier", "Contact", "Phone", "Email", "Amount due", "Status"],
    create: "New supplier"
  },
  payments: {
    endpoint: "supplier-payments",
    title: "Supplier payments",
    search: "Supplier, reference or purchase",
    filters: [["is_void", "Any status", [["false", "Active"], ["true", "Void"]]]],
    columns: ["Supplier", "Date", "Wallet", "Reference", "Amount", "Status"],
    create: "Record payment"
  },
  categories: {
    endpoint: "medicine-categories",
    title: "Medicine categories",
    search: "Category name",
    filters: [],
    columns: ["Name", "Description", "Status", "Updated"],
    create: "New category"
  },
};

function ResourcePage({ kind, user, notify }) {
  const { t } = useLanguage();
  const c = config[kind];
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("search", query.trim());
      
      Object.entries(filters).forEach(([k, v]) => {
        if (v && k !== "mode") params.set(k, v);
      });
      
      let endpoint = c.endpoint;
      if (kind === "medicines" && filters.mode === "low") {
        endpoint += "/low-stock";
      }
      
      try {
        const data = await api(`${endpoint}/?${params}`);
        setItems(rows(data));
        setMeta({
          count: data.count ?? rows(data).length,
          next: data.next,
          previous: data.previous
        });
      } catch (e) {
        setError(errorSummary(e));
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [c.endpoint, filters, kind, page, query, refreshKey]);

  const canCreate = kind === "payments"
    ? hasRole(user, "administrator", "pharmacy", "finance")
    : kind === "movements"
    ? hasRole(user, "administrator")
    : hasRole(user, ...WRITE_ROLES);

  function saved(message) {
    setDialog(null);
    setSelected(null);
    notify(message);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{c.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`${meta.count} ${meta.count === 1 ? "record" : "records"}`)}
          </p>
        </div>
        
        {c.create && canCreate && (
          <Button className="bg-cyan-700 px-4 shadow-sm hover:bg-cyan-800" onClick={() => setDialog("create")}>
            <Plus />
            {c.create}
          </Button>
        )}
      </div>

      {error && <ErrorBox message={error} retry={() => setRefreshKey((key) => key + 1)} />}

      <Card className="max-w-full gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-56 flex-1">
            <label className="sr-only" htmlFor={`${kind}-search`}>Search {c.title.toLowerCase()}</label>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${kind}-search`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder={`Search by ${c.search.toLowerCase()}…`}
            />
          </div>
          
          {c.filters.map(([key, placeholder, options]) => (
            <div key={key} className="min-w-44 flex-1 sm:max-w-56">
              <Select
                value={filters[key] || ""}
                placeholder={placeholder}
                options={options}
                onChange={(value) => {
                  setFilters({ ...filters, [key]: value });
                  setPage(1);
                }}
              />
            </div>
          ))}
          
          <Button variant="outline" size="icon" onClick={() => setRefreshKey((key) => key + 1)} aria-label="Refresh records" title="Refresh records">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="pharmacy-table w-full min-w-[850px] text-left text-sm">
            <caption className="sr-only">{c.title} records</caption>
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              <tr>
                {c.columns.map((col) => (
                  <th key={col} scope="col" className="px-5 py-3.5 font-semibold">
                    {col}
                  </th>
                ))}
                <th scope="col" className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={c.columns.length + 1} className="py-16 text-center text-muted-foreground">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" />
                    Loading…
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={c.columns.length + 1} className="py-16 text-center text-muted-foreground">
                    No records match these filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <ResourceRow
                    key={item.id}
                    kind={kind}
                    item={item}
                    user={user}
                    open={(mode = "detail") => {
                      setSelected(item);
                      setDialog(mode);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            {t(`${meta.count} total`)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.previous || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="px-2 py-2 text-xs text-muted-foreground">
              {t(`Page ${page}`)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.next || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {dialog && (
        <DialogRouter
          kind={kind}
          mode={dialog}
          item={selected}
          user={user}
          close={() => {
            setDialog(null);
            setSelected(null);
          }}
          saved={saved}
          onOpenExisting={(record) => {
            setSelected(record);
            setDialog("edit");
          }}
        />
      )}
    </div>
  );
}

function ResourceRow({ kind, item, user, open }) {
  const cells = useMemo(() => rowCells(kind, item, user), [kind, item, user]);
  const detailKinds = ["sales", "purchases", "batches", "suppliers", "payments", "medicines", "categories"];
  const canView = detailKinds.includes(kind);
  const canEdit = ["medicines", "suppliers", "categories", "batches"].includes(kind) &&
    hasRole(user, "administrator", "pharmacy");
  const canDelete = ["medicines", "suppliers", "categories"].includes(kind) &&
    hasRole(user, "administrator", "pharmacy");
  const canVoid = item.status !== "void" && !item.is_void &&
    ((["sales", "purchases"].includes(kind) && hasRole(user, "administrator")) ||
      (kind === "payments" && hasRole(user, "administrator", "finance")));
  const hasActions = canView || canEdit || canDelete || canVoid;

  return (
    <tr className="border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-cyan-50/40">
      {cells.map((cell, i) => (
        <td key={i} className="px-5 py-4 align-middle text-slate-700 dark:text-slate-300">
          {cell}
        </td>
      ))}
      <td className="px-5 py-4 text-right">
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Open row actions"
                  title="Actions"
                  className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-1.5">
              {canView && (
                <DropdownMenuItem className="min-h-9 px-2.5" onClick={() => open("detail")}>
                  <Eye /> View
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem className="min-h-9 px-2.5" onClick={() => open("edit")}>
                  <Pencil /> Edit
                </DropdownMenuItem>
              )}
              {(canDelete || canVoid) && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem variant="destructive" className="min-h-9 px-2.5" onClick={() => open("delete")}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              )}
              {canVoid && (
                <DropdownMenuItem variant="destructive" className="min-h-9 px-2.5" onClick={() => open("void")}>
                  <Ban /> Void
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

function rowCells(kind, x, user) {
  const state = (active) => (
    <Badge
      variant="secondary"
      className={active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );

  const status = (
    <Badge
      variant="secondary"
      className={x.status === "void" || x.is_void ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}
    >
      {x.status || (x.is_void ? "Void" : "Active")}
    </Badge>
  );

  if (kind === "sales") {
    return [
      <Name key="n" main={x.sale_number} sub={x.patient_name || "Walk-in"} />,
      formatDate(x.sale_date, true),
      `AFN ${money(x.subtotal)}`,
      `AFN ${money(x.discount_amount)}`,
      `AFN ${money(x.total_amount)}`,
      status
    ];
  }

  if (kind === "purchases") {
    return [
      <Name key="n" main={x.purchase_number} sub={x.supplier_name} />,
      formatDate(x.purchase_date),
      x.invoice_number,
      `AFN ${money(x.total_amount)}`,
      `AFN ${money(x.amount_due)}`,
      status
    ];
  }

  if (kind === "medicines") {
    return [
      <Name key="n" main={x.name} sub={`${x.code}${x.generic_name ? ` · ${x.generic_name}` : ""}`} />,
      x.category_name,
      [x.strength, x.dosage_form, x.unit].filter(Boolean).join(" · "),
      <span
        key="q"
        className={Number(x.stock_quantity) <= Number(x.reorder_level) ? "font-semibold text-amber-700 dark:text-amber-300" : ""}
      >
        {qty(x.stock_quantity)}
      </span>,
      qty(x.reorder_level),
      state(x.is_active)
    ];
  }

  if (kind === "batches") {
    const expired = new Date(`${x.expiry_date}T23:59:59`) <= new Date();
    return [
      <Name key="n" main={x.medicine_name} sub={x.batch_number} />,
      x.supplier_name,
      <span key="d" className={expired ? "font-semibold text-red-700 dark:text-red-300" : ""}>
        {formatDate(x.expiry_date)}
      </span>,
      qty(x.quantity_received),
      qty(x.quantity_available),
      expired ? (
        <Badge key="e" className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
          Expired
        </Badge>
      ) : state(x.is_active)
    ];
  }

  if (kind === "movements") {
    return [
      <Name key="n" main={x.medicine_name} sub={x.batch_number} />,
      formatDate(x.created_at, true),
      String(x.movement_type).replaceAll("_", " "),
      <span
        key="c"
        className={Number(x.quantity_change) > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}
      >
        {Number(x.quantity_change) > 0 ? "+" : ""}{qty(x.quantity_change)}
      </span>,
      qty(x.quantity_after),
      <Name key="r" main={x.reference} sub={x.reason} />
    ];
  }

  if (kind === "suppliers") {
    return [
      <Name key="n" main={x.name} sub={x.tax_number} />,
      x.contact_person || "—",
      x.phone || "—",
      x.email || "—",
      `AFN ${money(x.amount_due)}`,
      state(x.is_active)
    ];
  }

  if (kind === "payments") {
    return [
      x.supplier_name,
      formatDate(x.payment_date),
      x.wallet_name,
      x.reference_number || "—",
      `AFN ${money(x.amount)}`,
      status
    ];
  }

  return [
    x.name,
    x.description || "—",
    state(x.is_active),
    formatDate(x.updated_at, true)
  ];
}

function DialogRouter({ kind, mode, item, user, close, saved, onOpenExisting }) {
  if (mode === "create") {
    if (kind === "sales") {
      return <SaleForm user={user} onClose={close} onSaved={() => saved("Sale posted successfully.")} />;
    }
    if (kind === "purchases") {
      return <PurchaseForm onClose={close} onSaved={() => saved("Purchase posted and stock received.")} />;
    }
    if (kind === "medicines") {
      return <MedicineForm onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Medicine created.")} />;
    }
    if (kind === "movements") {
      return <StockAdjustmentForm onClose={close} onSaved={() => saved("Stock adjustment posted.")} />;
    }
    if (kind === "suppliers") {
      return <SimpleEntityForm kind="supplier" onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Supplier created.")} />;
    }
    if (kind === "payments") {
      return <PaymentForm onClose={close} onSaved={() => saved("Supplier payment posted.")} />;
    }
    if (kind === "categories") {
      return <CategoryForm onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Category created.")} />;
    }
  }

  if (mode === "edit") {
    if (kind === "medicines") {
      return <MedicineForm item={item} onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Medicine updated.")} />;
    }
    if (kind === "suppliers") {
      return <SimpleEntityForm kind="supplier" item={item} onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Supplier updated.")} />;
    }
    if (kind === "categories") {
      return <CategoryForm item={item} onClose={close} onOpenExisting={onOpenExisting} onSaved={() => saved("Category updated.")} />;
    }
    if (kind === "batches") {
      return <TransactionDetail kind={kind} item={item} user={user} onClose={close} onChanged={saved} initialMode="edit" />;
    }
  }

  if (mode === "delete") {
    return <DeleteRecordDialog kind={kind} item={item} onClose={close} onDeleted={() => saved("Record deleted successfully.")} />;
  }

  if (mode === "void") {
    const message = kind === "payments"
      ? "Payment voided."
      : kind === "sales"
      ? "Sale voided."
      : "Purchase voided.";
    
    return <VoidForm kind={kind} item={item} onClose={close} onSaved={() => saved(message)} />;
  }

  return (
    <TransactionDetail
      kind={kind}
      item={item}
      user={user}
      onClose={close}
      onVoid={() => {
        close();
        setTimeout(() => {}, 0);
      }}
      onChanged={(message) => saved(message)}
    />
  );
}

function DeleteRecordDialog({ kind, item, onClose, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endpoint = config[kind]?.endpoint;
  const recordName = item.name || item.code || "this record";

  async function remove() {
    setSaving(true);
    setError("");
    try {
      await api(`${endpoint}/${item.id}/`, { method: "DELETE" });
      onDeleted();
    } catch (reason) {
      setError(errorSummary(reason));
      setSaving(false);
    }
  }

  return (
    <Modal title="Delete record" subtitle="This action cannot be undone." onClose={onClose}>
      {error && <ErrorBox message={error} retry={remove} />}
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-slate-100">{recordName}</strong>?
      </p>
      <div className="mt-6 flex justify-end gap-3 border-t pt-5">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="destructive" onClick={remove} disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          Delete
        </Button>
      </div>
    </Modal>
  );
}

function Summary({ label, value, icon: Icon, tone }) {
  const colors = {
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    orange: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
  };

  return (
    <Card className="py-4">
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

function PanelTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between border-b p-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={action}>
        View all
      </Button>
    </div>
  );
}

function MiniList({ items, empty, render }) {
  return (
    <div className="p-3">
      {!items.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b p-3 last:border-0">
            {render(item)}
          </div>
        ))
      )}
    </div>
  );
}

function Name({ main, sub }) {
  return (
    <span className="block min-w-0 max-w-72">
      <strong className="block truncate font-medium" title={String(main || "")}>{main}</strong>
      {sub && (
        <small className="block max-w-60 truncate text-muted-foreground">
          {sub}
        </small>
      )}
    </span>
  );
}

function ErrorBox({ message, retry }) {
  return (
    <Alert className="mb-4" variant="destructive">
      <AlertCircle />
      <AlertDescription className="flex items-center justify-between gap-3">
        {message}
        <Button size="sm" variant="outline" onClick={retry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
