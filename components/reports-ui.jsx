"use client";

import { useId, useState } from "react";
import { AlertCircle, ArrowUpRight, BarChart3, LoaderCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readableErrors } from "@/components/pharmacy-ui";
import { useLanguage } from "@/components/language-provider";

export async function reportsApi(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/reports/${path}`, options);
  } catch {
    throw new Error("The hospital server could not be reached. Check your connection and try again.");
  }
  const type = response.headers.get("content-type") || "";
  if (response.ok && !type.includes("application/json")) return response;
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const details = data?.errors ?? data;
    const messages = readableErrors(details, response.status);
    const error = new Error(messages[0] || data?.message || "The report could not be loaded.");
    error.status = response.status;
    error.fields = details;
    throw error;
  }
  return data;
}

export function money(value, compact = false) {
  return new Intl.NumberFormat("en-US", compact
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function number(value, digits = 0) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
}

export function formatDate(value, time = false) {
  if (!value) return "—";
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`;
  return new Intl.DateTimeFormat(locale, time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

export function ReportLoading({ label = "Preparing report…" }) {
  const { t } = useLanguage();
  return <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400"><LoaderCircle className="size-4 animate-spin text-cyan-700 dark:text-cyan-300" />{t(label)}</div>;
}

export function ReportError({ error, retry }) {
  const { t } = useLanguage();
  return <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40"><AlertCircle /><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>{t(error?.message || "The report could not be loaded.")}</span><Button size="sm" variant="outline" onClick={retry}><RefreshCw />{t("Try again")}</Button></AlertDescription></Alert>;
}

export function EmptyReport({ title = "No data for this period", detail = "Try changing the report filters." }) {
  const { t } = useLanguage();
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"><BarChart3 className="size-5" /></span><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t(title)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(detail)}</p></div>;
}

const tones = {
  cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 ring-cyan-100",
  blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-blue-100",
  emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-100",
  amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-100",
  rose: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-100",
  violet: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-100",
};

export function MetricCard({ icon: Icon, label, value, detail, tone = "cyan", warning = false }) {
  const { t } = useLanguage();
  const translatedValue = typeof value === "string" ? t(value) : value;
  return <Card className="group relative gap-0 overflow-hidden border-white/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 p-5 shadow-[0_12px_35px_rgb(15_23_42_/_0.055)] ring-1 ring-slate-200/70 dark:ring-slate-700/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgb(15_23_42_/_0.09)]">
    <div className={`absolute -right-12 -top-12 size-32 rounded-full opacity-50 blur-3xl ${warning ? "bg-amber-200" : tones[tone].split(" ")[0]}`} />
    <div className="relative flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{t(label)}</p><p className="mt-3 truncate text-[1.65rem] font-semibold tracking-[-.045em] text-slate-950 dark:text-slate-50">{translatedValue}</p>{detail && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><ArrowUpRight className="size-3 text-slate-400 dark:text-slate-500" />{t(detail)}</p>}</div><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 ${tones[tone]}`}><Icon className="size-5" /></span></div>
  </Card>;
}

export function Panel({ title, subtitle, action, children, className = "" }) {
  const { t } = useLanguage();
  return <Card className={`gap-0 overflow-hidden border-white/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 py-0 shadow-[0_12px_35px_rgb(15_23_42_/_0.05)] ring-1 ring-slate-200/70 dark:ring-slate-700/70 ${className}`}><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100/90 dark:border-slate-800/90 px-5 py-4.5"><div><h3 className="text-[15px] font-semibold tracking-[-.015em] text-slate-950 dark:text-slate-50">{t(title)}</h3>{subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(subtitle)}</p>}</div>{action}</div>{children}</Card>;
}

const palette = ["#0891b2", "#2563eb", "#7c3aed", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];

export function LineChart({ series, valuePrefix = "AFN ", height = 230 }) {
  const { t } = useLanguage();
  const gradientId = useId().replaceAll(":", "");
  const [activeIndex, setActiveIndex] = useState(null);
  const width = 760; const pad = { x: 58, top: 28, bottom: 35 }; const innerH = height - pad.top - pad.bottom;
  const all = series.flatMap((item) => item.values.map((point) => Number(point.value || 0)));
  const max = Math.max(...all, 1); const labels = series[0]?.values || [];
  const x = (index) => pad.x + (labels.length <= 1 ? 0 : index * (width - pad.x * 2) / (labels.length - 1));
  const y = (value) => pad.top + innerH - Number(value || 0) / max * innerH;
  const onMove = (event) => { const bounds = event.currentTarget.getBoundingClientRect(); const chartX = (event.clientX - bounds.left) / bounds.width * width; const index = Math.round((chartX - pad.x) / ((width - pad.x * 2) / Math.max(labels.length - 1, 1))); setActiveIndex(Math.max(0, Math.min(labels.length - 1, index))); };
  return <div className="p-4 sm:p-5"><div className="mb-4 flex flex-wrap gap-5">{series.map((item, index) => <span key={item.name} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><i className="size-2.5 rounded-full" style={{ background: item.color || palette[index] }} />{t(item.name)}</span>)}</div><div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/80 dark:to-slate-900"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] touch-pan-x" role="img" aria-label={t("Income trend chart")} onPointerMove={onMove} onPointerLeave={() => setActiveIndex(null)}>
    <defs>{series.map((item, index) => <linearGradient key={item.name} id={`${gradientId}-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={item.color || palette[index]} stopOpacity=".24"/><stop offset=".8" stopColor={item.color || palette[index]} stopOpacity=".02"/><stop offset="1" stopColor={item.color || palette[index]} stopOpacity="0"/></linearGradient>)}</defs>
    {[0, .25, .5, .75, 1].map((step) => <g key={step}><line x1={pad.x} x2={width-pad.x} y1={pad.top+innerH*step} y2={pad.top+innerH*step} stroke="currentColor" strokeDasharray="2 6" className="text-slate-200 dark:text-slate-700"/><text x={pad.x-10} y={pad.top+innerH*step+4} textAnchor="end" fontSize="9" fontWeight="600" fill="#94a3b8">{money(max*(1-step), true)}</text></g>)}
    {series.map((item, seriesIndex) => { const points = item.values.map((point, index) => `${x(index)},${y(point.value)}`).join(" "); const area = `${x(0)},${pad.top+innerH} ${points} ${x(item.values.length-1)},${pad.top+innerH}`; return <g key={item.name}><polygon points={area} fill={`url(#${gradientId}-${seriesIndex})`}/><polyline points={points} fill="none" stroke={item.color || palette[seriesIndex]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{item.values.map((point,index)=><circle key={index} cx={x(index)} cy={y(point.value)} r={activeIndex === index ? 5 : 2.5} fill="currentColor" stroke={item.color || palette[seriesIndex]} strokeWidth={activeIndex === index ? 3 : 2} className="text-white transition-all dark:text-slate-900"><title>{point.label}: {valuePrefix}{money(point.value)}</title></circle>)}</g>; })}
    {activeIndex !== null && labels[activeIndex] && <g pointerEvents="none"><line x1={x(activeIndex)} x2={x(activeIndex)} y1={pad.top} y2={pad.top+innerH} stroke="#64748b" strokeDasharray="3 4" opacity=".45"/><rect x={Math.min(Math.max(x(activeIndex)-69, pad.x), width-pad.x-138)} y="3" width="138" height={20 + series.length*16} rx="8" fill="#0f172a" opacity=".94"/><text x={Math.min(Math.max(x(activeIndex), pad.x+69), width-pad.x-69)} y="18" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">{labels[activeIndex].label}</text>{series.map((item,index)=><text key={item.name} x={Math.min(Math.max(x(activeIndex), pad.x+69), width-pad.x-69)} y={34+index*15} textAnchor="middle" fontSize="9" fill={item.color || palette[index]}>{t(item.name)}: {valuePrefix}{money(item.values[activeIndex]?.value, true)}</text>)}</g>}
    {labels.map((point,index) => (index % Math.ceil(labels.length/6) === 0 || index === labels.length-1) && <text key={index} x={x(index)} y={height-8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">{point.label}</text>)}
  </svg></div></div>;
}

export function HorizontalBars({ data, valueKey = "value", labelKey = "label", formatter = number, emptyTitle, color = "#0891b2" }) {
  const { t } = useLanguage();
  if (!data?.length) return <EmptyReport title={emptyTitle} />;
  const max = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);
  return (
    <div className="space-y-4 p-5">
      {data.slice(0, 10).map((item, index) => {
        const label = item[labelKey] || "Unspecified";
        return (
          <div key={`${item[labelKey]}-${index}`}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">{typeof label === "string" ? t(label) : label}</span>
              <strong className="tabular-nums text-slate-900 dark:text-slate-100">{formatter(item[valueKey])}</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Number(item[valueKey] || 0) / max * 100)}%`, background: index ? `${color}bb` : color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ data, centerLabel = "Total", formatter = number }) {
  const { t } = useLanguage();
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return <EmptyReport />;
  const segments = data.map((item, index) => ({
    ...item,
    percent: Number(item.value || 0) / total * 100,
    offset: data.slice(0, index).reduce((sum, previous) => sum + Number(previous.value || 0) / total * 100, 0),
  }));
  return <div className="grid items-center gap-5 p-5 sm:grid-cols-[180px_1fr]"><div className="relative mx-auto size-40"><svg viewBox="0 0 42 42" className="-rotate-90" role="img" aria-label={t("Distribution chart")}>{segments.map((item,index) => <circle key={item.label} cx="21" cy="21" r="15.915" fill="none" stroke={item.color || palette[index]} strokeWidth="6" strokeDasharray={`${item.percent} ${100-item.percent}`} strokeDashoffset={-item.offset}><title>{t(item.label)}: {formatter(item.value)}</title></circle>)}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-lg text-slate-950 dark:text-slate-50">{formatter(total)}</strong><span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{t(centerLabel)}</span></div></div><div className="space-y-2.5">{data.map((item,index)=><div key={item.label} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-full" style={{background:item.color || palette[index]}}/><span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{t(item.label)}</span><strong className="tabular-nums text-slate-900 dark:text-slate-100">{formatter(item.value)}</strong></div>)}</div></div>;
}

export function DataTable({ columns, rows, emptyTitle = "No records to show" }) {
  const { t } = useLanguage();
  if (!rows?.length) return <EmptyReport title={emptyTitle} />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b bg-slate-50/70 dark:bg-slate-900/70 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500 dark:text-slate-400">{columns.map((column)=><th key={column.label} className={`px-5 py-3.5 ${column.align === "right" ? "text-right" : ""}`}>{t(column.label)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row,index)=><tr key={row.id || index} className="transition-colors hover:bg-cyan-50/30">{columns.map((column) => { const value = row[column.key] ?? "—"; return <td key={column.label} className={`px-5 py-3.5 text-slate-600 dark:text-slate-300 ${column.align === "right" ? "text-right tabular-nums" : ""}`}>{column.render ? column.render(row) : typeof value === "string" ? t(value) : value}</td>; })}</tr>)}</tbody></table></div>;
}
