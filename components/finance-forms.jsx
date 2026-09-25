"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, formatDate, inputError, Modal, money, Select, Textarea, today } from "@/components/pharmacy-ui";
import { ErrorBox, financeApi, jsonOptions, nowLocalInput, toLocalInput } from "@/components/finance-ui";
import { useLanguage } from "@/components/language-provider";

function Actions({ onClose, saving, label, danger = false }) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-5">
      <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button type="submit" variant={danger ? "destructive" : "default"} className={danger ? "" : "bg-cyan-700 hover:bg-cyan-800"} disabled={saving}>
        {saving && <LoaderCircle className="animate-spin" />}{label}
      </Button>
    </div>
  );
}

export function WalletForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: item?.code || "", name: item?.name || "", kind: item?.kind || "custom",
    allow_negative: item?.allow_negative || false, is_active: item?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const system = item && item.kind !== "custom";
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const path = item ? `wallets/${item.id}/` : "wallets/";
      await financeApi(path, jsonOptions(item ? "PATCH" : "POST", form));
      onSaved(item ? "Wallet updated." : "Custom wallet created.");
    } catch (reason) { setError(reason); setSaving(false); }
  }

  return (
    <Modal title={item ? "Edit wallet" : "Create custom wallet"} subtitle={system ? "System wallet identity and policy are protected." : "Configure a secure cash or bank balance container."} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox error={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Wallet code" error={inputError(error, "code")}><Input required disabled={system} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} /></Field>
          <Field label="Wallet name" error={inputError(error, "name")}><Input required disabled={system} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        </div>
        <Field label="Wallet type" error={inputError(error, "kind")}>
          <Select disabled options={[["custom", "Custom wallet"], ["reception", "Reception"], ["pharmacy", "Pharmacy"], ["manager", "Manager"]]} value={form.kind} onChange={(value) => set("kind", value)} />
        </Field>
        <div className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 p-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Checkbox checked={form.is_active} onCheckedChange={(value) => set("is_active", Boolean(value))} />
            <span><strong className="block font-semibold text-slate-900 dark:text-slate-100">Active wallet</strong>Available for new financial postings</span>
          </label>
          <label className={`flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 ${system ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
            <Checkbox disabled={system} checked={form.allow_negative} onCheckedChange={(value) => set("allow_negative", Boolean(value))} />
            <span><strong className="block font-semibold text-slate-900 dark:text-slate-100">Allow negative balance</strong>Permit debits beyond available funds</span>
          </label>
        </div>
        {item && <div className="rounded-xl border border-cyan-100 dark:border-cyan-800 bg-cyan-50/60 dark:bg-cyan-950/40 p-4"><p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Current balance</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">AFN {money(item.balance)}</p></div>}
        <Actions onClose={onClose} saving={saving} label={item ? "Save changes" : "Create wallet"} />
      </form>
    </Modal>
  );
}

export function CategoryForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ name: item?.name || "", description: item?.description || "", is_active: item?.is_active ?? true });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await financeApi(item ? `expense-categories/${item.id}/` : "expense-categories/", jsonOptions(item ? "PATCH" : "POST", form));
      onSaved(item ? "Expense category updated." : "Expense category created.");
    } catch (reason) { setError(reason); setSaving(false); }
  }
  return <Modal title={item ? "Edit expense category" : "New expense category"} subtitle="Organize operational spending for clearer reporting." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBox error={error} />}
      <Field label="Category name" error={inputError(error, "name")}><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Description" error={inputError(error, "description")}><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm font-medium text-slate-800 dark:text-slate-200"><Checkbox checked={form.is_active} onCheckedChange={(value) => setForm({ ...form, is_active: Boolean(value) })} />Active and available for expenses</label>
      <Actions onClose={onClose} saving={saving} label={item ? "Save changes" : "Create category"} />
    </form>
  </Modal>;
}

export function ExpenseForm({ wallets, categories, onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ category: "", wallet: "", expense_date: today(), amount: "", payee: "", purpose: "", receipt_number: "", attachment: null });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => { if (value !== null && value !== "") body.append(key, value); });
    try { await financeApi("expenses/", { method: "POST", body }); onSaved("Expense posted and wallet debited."); }
    catch (reason) { setError(reason); setSaving(false); }
  }
  return <Modal wide title="Post expense" subtitle="This creates an immutable expense and corresponding wallet debit." onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorBox error={error} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Category" error={inputError(error, "category")}><Select required value={form.category} onChange={(v) => set("category", v)} options={categories.filter((x) => x.is_active).map((x) => [x.id, x.name])} /></Field>
        <Field label="Pay from wallet" error={inputError(error, "wallet")}><Select required value={form.wallet} onChange={(v) => set("wallet", v)} options={wallets.filter((x) => x.is_active).map((x) => [x.id, `${x.name} · AFN ${money(x.balance)}`])} /></Field>
        <Field label="Expense date" error={inputError(error, "expense_date")}><DatePicker required max={today()} value={form.expense_date} onChange={(value) => set("expense_date", value)} /></Field>
        <Field label="Amount (AFN)" error={inputError(error, "amount")}><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="Payee"><Input value={form.payee} onChange={(e) => set("payee", e.target.value)} /></Field>
        <Field label="Receipt number"><Input value={form.receipt_number} onChange={(e) => set("receipt_number", e.target.value)} /></Field>
      </div>
      <Field label="Purpose" error={inputError(error, "purpose")}><Textarea required value={form.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
      <Field label="Receipt attachment" hint="Optional supporting file."><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"><span className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{t("Choose file")}</span><span className="truncate text-slate-500 dark:text-slate-400">{form.attachment?.name || t("No file chosen")}</span><Input className="sr-only" type="file" onChange={(e) => set("attachment", e.target.files?.[0] || null)} /></label></Field>
      <Actions onClose={onClose} saving={saving} label="Post expense" />
    </form>
  </Modal>;
}

export function TurnoverForm({ wallets, onClose, onSaved }) {
  const active = wallets.filter((wallet) => wallet.is_active);
  const [form, setForm] = useState(() => ({
    source_wallet: "", destination_wallet: "", amount: "",
    period_start: toLocalInput(new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()),
    period_end: nowLocalInput(), notes: "",
  }));
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await financeApi("turnovers/", jsonOptions("POST", { ...form, period_start: new Date(form.period_start).toISOString(), period_end: new Date(form.period_end).toISOString() }));
      onSaved("Turnover posted to both wallets.");
    } catch (reason) { setError(reason); setSaving(false); }
  }
  return <Modal wide title="Record turnover" subtitle="Transfer a reconciled amount between two wallets for a closed period." onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorBox error={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source wallet" error={inputError(error, "source_wallet")}><Select required value={form.source_wallet} onChange={(v) => set("source_wallet", v)} options={active.map((x) => [x.id, `${x.name} · AFN ${money(x.balance)}`])} /></Field>
        <Field label="Destination wallet" error={inputError(error, "destination_wallet")}><Select required value={form.destination_wallet} onChange={(v) => set("destination_wallet", v)} options={active.filter((x) => x.id !== form.source_wallet).map((x) => [x.id, x.name])} /></Field>
        <Field label="Amount (AFN)" error={inputError(error, "amount")}><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <div />
        <Field label="Period start" error={inputError(error, "period_start")}><Input required type="datetime-local" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} /></Field>
        <Field label="Period end" error={inputError(error, "period_end")}><Input required type="datetime-local" value={form.period_end} onChange={(e) => set("period_end", e.target.value)} /></Field>
      </div>
      <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <Actions onClose={onClose} saving={saving} label="Post turnover" />
    </form>
  </Modal>;
}

export function VoidExpenseForm({ item, onClose, onSaved }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    try { await financeApi(`expenses/${item.id}/void/`, jsonOptions("POST", { reason })); onSaved("Expense voided and wallet balance restored."); }
    catch (value) { setError(value); setSaving(false); }
  }
  return <Modal title="Void expense" subtitle="A reversal entry will restore the amount to the original wallet." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBox error={error} />}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-300"><div className="flex gap-3"><TriangleAlert className="mt-0.5 size-5 shrink-0" /><p><strong className="block">AFN {money(item.amount)} · {item.category_name}</strong>This action keeps the original record for audit history.</p></div></div>
      <Field label="Reason for voiding" error={inputError(error, "reason")}><Textarea required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Actions onClose={onClose} saving={saving} label="Void expense" danger />
    </form>
  </Modal>;
}

export function ConfirmAction({ kind, item, onClose, onSaved }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState(null);
  const deleting = kind === "delete-wallet" || kind === "delete-category";
  const endpoint = kind === "receive" ? `turnovers/${item.id}/receive/` : kind === "delete-wallet" ? `wallets/${item.id}/` : `expense-categories/${item.id}/`;
  async function act() {
    setSaving(true); setError(null);
    try { await financeApi(endpoint, deleting ? { method: "DELETE" } : jsonOptions("POST", {})); onSaved(kind === "receive" ? "Turnover marked as received." : "Record deleted."); }
    catch (reason) { setError(reason); setSaving(false); }
  }
  return <Modal title={kind === "receive" ? "Confirm receipt" : "Delete record"} subtitle={kind === "receive" ? "Acknowledge that the destination holder received this turnover." : "This action cannot be undone."} onClose={onClose}>
    {error && <ErrorBox error={error} />}
    <div className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${deleting ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}>{deleting ? <Trash2 /> : <CheckCircle2 />}</span><div><p className="font-semibold text-slate-950 dark:text-slate-50">{kind === "receive" ? `${item.source_wallet_name} → ${item.destination_wallet_name}` : item.name}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{kind === "receive" ? `AFN ${money(item.amount)} · ${formatDate(item.created_at, true)}` : "Only records not referenced by financial activity can be deleted."}</p></div></div>
    <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button variant={deleting ? "destructive" : "default"} className={deleting ? "" : "bg-cyan-700 hover:bg-cyan-800"} onClick={act} disabled={saving}>{saving && <LoaderCircle className="animate-spin" />}{kind === "receive" ? "Confirm receipt" : "Delete"}</Button></div>
  </Modal>;
}

export function FinanceDetail({ kind, item, onClose }) {
  const { t, language } = useLanguage();
  const hidden = new Set(["id", "category", "wallet", "source_wallet", "destination_wallet", "created_by", "voided_by", "handed_over_by", "received_by", "reverses", "source_id"]);
  const labels = { created_at: "Created", updated_at: "Updated", transaction_date: "Transaction date", expense_date: "Expense date", period_start: "Period start", period_end: "Period end", received_at: "Received at", balance_after: "Balance after", entry_type_display: "Entry type", category_display: "Category", created_by_name: "Created by", handed_over_by_name: "Handed over by", received_by_name: "Received by", voided_by_name: "Voided by", source_type: "Source type", reverses_reference: "Reverses", reversed_by_reference: "Reversed by", source_wallet_name: "Source wallet name", destination_wallet_name: "Destination wallet name", status_display: "Status display", is_void: "Is void" };
  const moneyKeys = new Set(["amount", "balance", "balance_after"]);
  const dateKeys = new Set(["created_at", "updated_at", "transaction_date", "expense_date", "period_start", "period_end", "received_at", "voided_at"]);
  const translatedValueKeys = new Set(["status", "status_display", "entry_type", "entry_type_display", "source_type"]);
  return <Modal wide title={kind === "transactions" ? "Ledger entry" : kind === "expenses" ? "Expense details" : "Turnover details"} subtitle="Read-only audited financial record." onClose={onClose}>
    <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 sm:grid-cols-2">
      {Object.entries(item).filter(([key, value]) => !hidden.has(key) && value !== null && value !== "" && typeof value !== "object").map(([key, value]) => <div key={key} className="bg-white dark:bg-slate-900 p-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t(labels[key] || key.replaceAll("_", " "))}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{moneyKeys.has(key) ? `AFN ${money(value)}` : dateKeys.has(key) ? formatDate(value, key !== "expense_date", language) : typeof value === "boolean" ? t(value ? "Yes" : "No") : translatedValueKeys.has(key) ? t(String(value).replaceAll("_", " ")) : String(value)}</dd></div>)}
    </dl>
    {item.attachment && <Button className="mt-5" variant="outline" render={<a href={item.attachment} target="_blank" rel="noreferrer" />}>Open attachment</Button>}
  </Modal>;
}
