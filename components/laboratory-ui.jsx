"use client";

import { cloneElement, isValidElement, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { formatDate as sharedFormatDate } from "@/components/pharmacy-ui";

export const LAB_ROLES = ["administrator", "laboratory", "manager", "clinician", "reception"];
export const LAB_WRITE_ROLES = ["administrator", "laboratory"];

export function Modal({ title, subtitle, onClose, wide = false, children }) {
  const { t } = useLanguage();
  const id = useId();
  const translate = (value) => typeof value === "string" ? t(value) : value;
  useEffect(() => {
    const escape = (event) => event.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", escape); };
  }, [onClose]);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pharmacy-section fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby={id} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_30px_90px_rgba(15,23,42,.24)] sm:max-h-[calc(100dvh-3rem)] ${wide ? "max-w-5xl" : "max-w-xl"}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div><h2 id={id} className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{translate(title)}</h2>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{translate(subtitle)}</p>}</div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("Close")}><X /></Button>
        </div>
        <div className="p-5 md:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, error, hint, children }) {
  const { t } = useLanguage();
  const generated = useId();
  const id = children?.props?.id || generated;
  const control = isValidElement(children) ? cloneElement(children, { id, "aria-invalid": Boolean(error) }) : children;
  return <div className="space-y-2"><Label htmlFor={id} className="font-semibold text-slate-700 dark:text-slate-300">{typeof label === "string" ? t(label) : label}{children?.props?.required && <span className="ml-1 text-red-500">*</span>}</Label>{control}{(error || hint) && <p className={`text-xs ${error ? "font-medium text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}`}>{typeof (error || hint) === "string" ? t(error || hint) : error || hint}</p>}</div>;
}

export function Select({ value, onChange, options, placeholder = "Select", className = "", ...props }) {
  const { t } = useLanguage();
  return <select {...props} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm shadow-sm outline-none focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10 disabled:bg-slate-100 ${className}`}><option value="">{t(placeholder)}</option>{options.map(([key, label]) => <option key={key} value={key}>{typeof label === "string" ? t(label) : label}</option>)}</select>;
}

export function Textarea(props) { return <textarea {...props} className={`min-h-28 w-full resize-y rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3.5 text-sm shadow-sm outline-none focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10 ${props.className || ""}`} />; }
export const rows = (data) => Array.isArray(data) ? data : data?.results || [];
export const labelize = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const formatDate = sharedFormatDate;

export async function labApi(path, options) {
  let response;
  try { response = await fetch(`/api/laboratory/${path}`, options); }
  catch { throw new Error("The hospital server could not be reached."); }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const source = data?.errors ?? data;
    const error = new Error(readableErrors(source)[0] || data?.message || `Request failed (HTTP ${response.status}).`);
    error.status = response.status; error.fields = source; throw error;
  }
  return data;
}

export function readableErrors(source) {
  const messages = [];
  const visit = (value, path = []) => {
    if (typeof value === "string") messages.push(path.length ? `${labelize(path.join(" · "))}: ${value}` : value);
    else if (Array.isArray(value)) value.forEach((item) => visit(item, path));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => key !== "status_code" && visit(item, key === "errors" ? path : [...path, key]));
  };
  visit(source); return [...new Set(messages)];
}
export const errorSummary = (error) => error?.message || "The request could not be completed.";
export const inputError = (error, key) => readableErrors(error?.fields?.[key] ?? error?.fields?.errors?.[key]).join(" ");
export const jsonRequest = (path, payload, method = "POST") => labApi(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
