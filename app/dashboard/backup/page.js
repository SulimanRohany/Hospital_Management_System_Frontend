"use client";

import { useCallback, useState } from "react";
import {
  ArrowDownToLine,
  CalendarRange,
  CheckCircle2,
  Database,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Panel, reportsApi } from "@/components/reports-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasRole } from "@/lib/roles";

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function BackupPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: false, error: "", success: "" });

  const download = useCallback(async () => {
    setState({ loading: true, error: "", success: "" });
    try {
      const response = await reportsApi("database-backup/", { method: "POST" });
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const filename = decodeURIComponent(match?.[1] || `health-plus-backup-${localDate(new Date())}.dump`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setState({ loading: false, error: "", success: `${filename} was downloaded successfully.` });
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  }, []);

  if (!hasRole(user, "administrator")) {
    return <Alert variant="destructive"><TriangleAlert /><AlertDescription>You do not have access to database backups.</AlertDescription></Alert>;
  }

  return <div className="operations-section space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Data protection</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-slate-50 sm:text-4xl">Database backup</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Create and download a protected snapshot of the hospital database.</p>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 p-0 shadow-sm">
        <div className="bg-[linear-gradient(135deg,#083344,#155e75)] p-6 text-white sm:p-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Database className="size-6" /></span>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-200">Administrator safeguard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create a database backup</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cyan-50/75">Generate a consistent PostgreSQL backup and download it to your computer. The action is recorded in the audit log.</p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          {state.error && <Alert variant="destructive"><TriangleAlert /><AlertDescription>{state.error}</AlertDescription></Alert>}
          {state.success && <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="text-emerald-700 dark:text-emerald-300" /><AlertDescription className="text-emerald-800 dark:text-emerald-300">{state.success}</AlertDescription></Alert>}
          <Button size="lg" className="bg-cyan-700 hover:bg-cyan-800" onClick={download} disabled={state.loading}>{state.loading ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}{state.loading ? "Creating protected copy…" : "Create & download backup"}</Button>
        </div>
      </Card>
      <Panel title="Backup checklist" subtitle="Keep hospital data recoverable">
        <div className="space-y-4 p-5">
          {[[ShieldCheck, "Store securely", "Move the file to encrypted, access-controlled storage."], [CalendarRange, "Back up regularly", "Create backups on a schedule appropriate for data volume."], [Database, "Keep multiple versions", "Retain more than one dated snapshot for resilience."]].map(([Icon, title, detail]) => <div key={title} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"><Icon className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p></div></div>)}
        </div>
      </Panel>
    </div>
  </div>;
}
