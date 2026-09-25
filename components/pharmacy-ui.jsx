"use client";

import { cloneElement, isValidElement, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";

export const PHARMACY_ROLES = ["administrator", "pharmacy", "manager", "finance"];
export const WRITE_ROLES = ["administrator", "pharmacy"];

export function Modal({ title, subtitle, onClose, wide = false, children }) {
  const { t } = useLanguage();
  const titleId = useId();
  const translate = (value) => typeof value === "string" ? t(value) : value;

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pharmacy-section fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/65 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_32px_90px_rgba(8,47,73,0.22)] ring-1 ring-cyan-500/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 sm:max-h-[calc(100dvh-3rem)] ${wide ? "max-w-5xl" : "max-w-xl"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-700 px-5 py-4 text-white shadow-sm sm:px-6 sm:py-5">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-white">
              {translate(title)}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-cyan-50/80">
                {translate(subtitle)}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("Close")}
            className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/15 hover:text-white"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50/90 p-5 dark:bg-slate-950/40 md:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, hint, error, children }) {
  const { t } = useLanguage();
  const generatedId = useId();
  const inputId = children?.props?.id || generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;
  const placeholder = typeof label === "string"
    ? label.replace(/\s*[·(].*$/, "").trim()
    : "Enter value";
  const isSelect = isValidElement(children) && children.type === Select;
  const isRequired = Boolean(children?.props?.required);
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: inputId,
        "aria-invalid": Boolean(error),
        "aria-describedby": descriptionId,
        ...(!children.props.placeholder
          ? { placeholder: `${isSelect ? "Select" : "Enter"} ${placeholder.toLowerCase()}` }
          : {})
      })
    : children;

  return (
    <div className="space-y-2.5">
      <Label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {typeof label === "string" ? t(label) : label}
        {isRequired && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </Label>
      {control}
      {(hint || error) && (
        <p id={descriptionId} className={`text-xs leading-5 ${error ? "font-medium text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}`}>
          {typeof (error || hint) === "string" ? t(error || hint) : error || hint}
        </p>
      )}
    </div>
  );
}

export function Select({ 
  name,
  value, 
  onChange, 
  placeholder = "Select", 
  options, 
  required = false, 
  disabled = false, 
  className = "" 
}) {
  const { t } = useLanguage();
  return (
    <select 
      name={name}
      required={required} 
      disabled={disabled} 
      value={value} 
      onChange={(event) => onChange(event.target.value)} 
      className={`h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${className}`}
    >
      <option value="">
        {t(placeholder)}
      </option>
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {typeof label === "string" ? t(label) : label}
        </option>
      ))}
    </select>
  );
}

export function Textarea(props) { 
  return (
    <textarea 
      {...props} 
      className={`min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${props.className || ""}`} 
    />
  ); 
}

export function money(value) { 
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Number(value || 0)); 
}

export function qty(value) { 
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 3, 
    maximumFractionDigits: 3 
  }).format(Number(value || 0)); 
}

export function today() { 
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; 
}

const localizedMonths = {
  ps: ["جنوري", "فبروري", "مارچ", "اپرېل", "مې", "جون", "جولای", "اګست", "سېپتمبر", "اکتوبر", "نومبر", "دسمبر"],
  fa: ["جنوری", "فبروری", "مارچ", "اپریل", "می", "جون", "جولای", "اگست", "سپتمبر", "اکتوبر", "نومبر", "دسمبر"],
};

export function formatDate(value, time = false, languageOverride) { 
  if (!value) return "—"; 

  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const language = languageOverride || (typeof document === "undefined" ? "en" : document.documentElement.lang || "en");
  if (language === "ps" || language === "fa") {
    const date = language === "ps"
      ? `${d.getFullYear()} ${localizedMonths.ps[d.getMonth()]} ${d.getDate()}`
      : `${d.getDate()} ${localizedMonths.fa[d.getMonth()]} ${d.getFullYear()}`;
    if (!time) return date;
    const clock = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${date}، ${clock}`;
  }
  return new Intl.DateTimeFormat("en", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(d); 
}

export function rows(data) { 
  return Array.isArray(data) ? data : data?.results || []; 
}
export async function api(path, options) {
  let response;
  
  try { 
    response = await fetch(`/api/pharmacy/${path}`, options); 
  } catch { 
    throw new Error("The hospital server could not be reached. Check your connection and try again."); 
  }
  
  let data = null;
  
  if (response.status !== 204) {
    try { 
      data = await response.json(); 
    } catch { 
      if (!response.ok) {
        throw new Error(`The server returned an unreadable error (HTTP ${response.status}).`);
      }
    }
  }
  
  if (!response.ok) {
    const details = data?.errors ?? data;
    const messages = readableErrors(details, response.status);
    const error = new Error(messages[0]);
    
    error.status = response.status;
    error.fields = details;
    error.messages = messages;
    
    throw error;
  }
  
  return data;
}

const fieldLabels = {
  amount: "Amount", 
  batch: "Batch", 
  batch_number: "Batch number", 
  category: "Category",
  code: "Medicine code", 
  detail: "Error", 
  discount_amount: "Discount", 
  discount_reason: "Discount reason",
  email: "Email", 
  expiry_date: "Expiry date", 
  invoice_number: "Supplier invoice", 
  is_active: "Status",
  lines: "Purchase or sale lines", 
  medicine: "Medicine", 
  name: "Name", 
  non_field_errors: "Error",
  paid_amount: "Paid amount", 
  patient: "Patient", 
  payment_date: "Payment date", 
  prescription_reference: "Prescription reference",
  purchase: "Purchase", 
  purchase_date: "Purchase date", 
  quantity: "Quantity", 
  quantity_change: "Quantity adjustment",
  reason: "Reason", 
  sale_date: "Sale date", 
  sale_price: "Sale price", 
  supplier: "Supplier", 
  unit_cost: "Unit cost",
  unit_price: "Unit price", 
  wallet: "Wallet",
};

const ignoredErrorKeys = new Set(["success", "status_code", "code"]);

export function readableErrors(source, status) {
  const found = [];
  
  function visit(value, path = []) {
    if (value == null || value === false) return;
    
    if (typeof value === "string") {
      const label = path.length ? path.map(labelPart).join(" · ") : "";
      found.push(label && !["Error", "Details"].includes(label) ? `${label}: ${value}` : value);
      return;
    }
    
    if (Array.isArray(value)) { 
      value.forEach((item, index) => 
        visit(item, typeof item === "object" && !Array.isArray(item) ? [...path, index] : path)
      ); 
      return;
    }
    
    if (typeof value === "object") {
      if (value.message && typeof value.message === "string") {
        found.push(value.message);
      }
      
      Object.entries(value).forEach(([key, item]) => { 
        if (!ignoredErrorKeys.has(key) && key !== "message") {
          visit(item, key === "errors" ? path : [...path, key]);
        }
      });
    }
  }
  
  visit(source);
  const unique = [...new Set(found.filter(Boolean))];
  
  if (unique.length) return unique;
  
  if (status === 401) return ["Your session has expired. Sign in again and retry."];
  if (status === 403) return ["Your account does not have permission to perform this action."];
  if (status === 404) return ["The requested pharmacy record could not be found. It may have been removed."];
  if (status === 409) return ["This action conflicts with newer stock or payment information. Refresh the page and try again."];
  if (status >= 500) return ["The hospital server encountered an error. Your changes were not saved; please try again."];
  if (status) return ["The information could not be saved. Review the highlighted fields and try again."];
  
  return [];
}

export function errorSummary(error) { 
  return error?.messages?.[0] || 
    readableErrors(error?.fields, error?.status)[0] || 
    error?.message; 
}

export function inputError(error, key) {
  const source = error?.fields;
  
  if (!source || typeof source !== "object") return "";
  
  const value = Object.prototype.hasOwnProperty.call(source, key) 
    ? source[key]
    : source.errors && 
      typeof source.errors === "object" && 
      Object.prototype.hasOwnProperty.call(source.errors, key) 
      ? source.errors[key]
      : undefined;
  
  if (value == null || value === false) return "";
  
  return readableErrors(value).join(" ");
}

function labelPart(part) { 
  if (typeof part === "number") return `Line ${part + 1}`; 
  
  return fieldLabels[part] || 
    String(part).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); 
}
