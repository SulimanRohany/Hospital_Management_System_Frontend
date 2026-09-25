"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, Printer } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-provider";
import { useBranding } from "@/components/branding-context";
import { HospitalLogo } from "@/components/hospital-logo";

const paymentStatus = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
};

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateTime(value) {
  if (!value) return "—";
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en-GB" : `${language}-AF-u-ca-gregory-nu-latn`;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-6 py-1.5 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-right text-slate-900 dark:text-slate-100 ${strong ? "font-bold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

export default function ReceiptPage() {
  const { id } = useParams();
  const { branding } = useBranding();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      try {
        const response = await fetch(`/api/reception/receptions/${id}/receipt`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load this receipt.");
        }

        if (active) setReceipt(data);
      } catch (reason) {
        if (active) setError(reason.message || "Unable to load this receipt.");
      }
    }

    if (id) loadReceipt();
    return () => { active = false; };
  }, [id]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-800 p-6">
        <div className="fixed right-5 top-5 rtl:right-auto rtl:left-5"><LanguageSwitcher /></div>
        <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">Receipt unavailable</h1>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
          <button className="mt-6 rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => window.close()}>
            Close
          </button>
        </div>
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        <div className="fixed right-5 top-5 rtl:right-auto rtl:left-5"><LanguageSwitcher /></div>
        <LoaderCircle className="mr-2 size-5 animate-spin" /> Loading receipt…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-800 px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[760px] items-center justify-between print:hidden">
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => window.close()}>
          <ArrowLeft className="size-4" /> Close
        </button>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800" onClick={() => window.print()}>
            <Printer className="size-4" /> Print receipt
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-[760px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-cyan-700 pb-6">
          <div className="flex items-center gap-3">
            <HospitalLogo className="size-12 rounded-xl bg-cyan-700 p-1.5 text-white" iconClassName="size-7" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50" data-no-translate><bdi dir="auto">{branding.hospital_name}</bdi></h1>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Payment receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Receipt number</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-950 dark:text-slate-50">{receipt.receipt_number}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Issued {dateTime(receipt.issued_at)}</p>
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-200 dark:border-slate-700 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Patient</h2>
            <p className="text-lg font-bold text-slate-950 dark:text-slate-50">{receipt.patient.name}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">MRN: {receipt.patient.medical_record_number}</p>
          </div>
          <div className="sm:text-right">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Visit</h2>
            <p className="font-semibold text-slate-950 dark:text-slate-50">{receipt.department}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{dateTime(receipt.visit_date)}</p>
            {receipt.provider && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Provider: {receipt.provider}</p>}
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Services</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_70px_120px] bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Description</span><span className="text-center">Qty</span><span className="text-right">Amount</span>
            </div>
            {receipt.services.map((service) => (
              <div key={service.id} className="grid grid-cols-[1fr_70px_120px] border-t border-slate-200 dark:border-slate-700 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{service.service_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{service.service_code}</p>
                </div>
                <span className="text-center text-slate-700 dark:text-slate-300">{service.quantity}</span>
                <span className="text-right font-semibold text-slate-900 dark:text-slate-100">AFN {money(service.line_total)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ml-auto w-full max-w-sm border-t border-slate-200 dark:border-slate-700 pt-4">
          <Row label="Subtotal" value={`AFN ${money(receipt.total_amount)}`} />
          {Number(receipt.discount_amount) > 0 && <Row label="Discount" value={`− AFN ${money(receipt.discount_amount)}`} />}
          <Row label="Net total" value={`AFN ${money(receipt.net_amount)}`} strong />
          <Row label="Amount paid" value={`AFN ${money(receipt.paid_amount)}`} />
          <div className="mt-2 border-t border-slate-300 dark:border-slate-600 pt-2">
            <Row label="Balance due" value={`AFN ${money(receipt.balance_due)}`} strong />
          </div>
        </section>

        {receipt.payments.length > 0 && (
          <section className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment history</h2>
            {receipt.payments.map((payment) => (
              <div key={payment.id} className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 py-2 text-sm last:border-0">
                <span className="text-slate-600 dark:text-slate-300">{dateTime(payment.paid_at)} · <span className="capitalize">{payment.method}</span></span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">AFN {money(payment.amount)}</span>
              </div>
            ))}
          </section>
        )}

        <footer className="mt-8 flex items-end justify-between gap-6 border-t border-dashed border-slate-300 dark:border-slate-600 pt-5 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <p>Received by: <span className="font-medium text-slate-700 dark:text-slate-300">{receipt.created_by}</span></p>
            <p className="mt-1">Payment status: <span className="font-semibold text-slate-700 dark:text-slate-300">{paymentStatus[receipt.payment_status] || receipt.payment_status}</span></p>
          </div>
          <p className="text-right">Thank you. Please keep this receipt for your records.</p>
        </footer>
      </article>
    </main>
  );
}
