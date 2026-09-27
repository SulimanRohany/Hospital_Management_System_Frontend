"use client";

import { useCallback, useState } from "react";
import {
  ArchiveRestore,
  ArrowDownToLine,
  CalendarRange,
  CheckCircle2,
  Database,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Panel, reportsApi } from "@/components/reports-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasRole } from "@/lib/roles";

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function BackupPage() {
  const { user, logout } = useAuth();
  const [backupState, setBackupState] = useState({ loading: false, error: "", success: "" });
  const [restoreState, setRestoreState] = useState({ loading: false, error: "" });
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmation, setConfirmation] = useState("");

  const download = useCallback(async () => {
    setBackupState({ loading: true, error: "", success: "" });
    try {
      const response = await reportsApi("database-backup/", { method: "POST" });
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const filename = decodeURIComponent(match?.[1] || `health-plus-backup-${localDate(new Date())}.sqlite3`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setBackupState({ loading: false, error: "", success: `${filename} was downloaded successfully.` });
    } catch (error) {
      setBackupState({ loading: false, error: error.message, success: "" });
    }
  }, []);

  const restore = useCallback(async () => {
    if (!restoreFile || confirmation !== "RESTORE") return;
    setRestoreState({ loading: true, error: "" });
    try {
      const form = new FormData();
      form.append("backup", restoreFile);
      form.append("confirmation", confirmation);
      await reportsApi("database-restore/", { method: "POST", body: form });
      await logout();
    } catch (error) {
      setRestoreState({ loading: false, error: error.message });
    }
  }, [confirmation, logout, restoreFile]);

  if (!hasRole(user, "administrator")) {
    return <Alert variant="destructive"><TriangleAlert /><AlertDescription>You do not have access to database backups.</AlertDescription></Alert>;
  }

  return <div className="operations-section space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Data protection</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-slate-50 sm:text-4xl">Database backup & restore</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Download a protected snapshot or restore the complete system from one of your backups.</p>
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 p-0 shadow-sm">
        <div className="bg-[linear-gradient(135deg,#083344,#155e75)] p-6 text-white sm:p-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Database className="size-6" /></span>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-200">Administrator safeguard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create a database backup</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cyan-50/75">Generate a consistent SQLite backup and download it to your computer. The action is recorded in the audit log.</p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          {backupState.error && <Alert variant="destructive"><TriangleAlert /><AlertDescription>{backupState.error}</AlertDescription></Alert>}
          {backupState.success && <Alert className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"><CheckCircle2 className="text-emerald-700 dark:text-emerald-300" /><AlertDescription className="text-emerald-800 dark:text-emerald-300">{backupState.success}</AlertDescription></Alert>}
          <Button size="lg" className="bg-cyan-700 hover:bg-cyan-800" onClick={download} disabled={backupState.loading || restoreState.loading}>{backupState.loading ? <LoaderCircle className="animate-spin" /> : <ArrowDownToLine />}{backupState.loading ? "Creating protected copy…" : "Create & download backup"}</Button>
        </div>
      </Card>
      <Panel title="Backup checklist" subtitle="Keep hospital data recoverable">
        <div className="space-y-4 p-5">
          {[[ShieldCheck, "Store securely", "Move the file to encrypted, access-controlled storage."], [CalendarRange, "Back up regularly", "Create backups on a schedule appropriate for data volume."], [Database, "Keep multiple versions", "Retain more than one dated snapshot for resilience."]].map(([Icon, title, detail]) => <div key={title} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300"><Icon className="size-4" /></span><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p></div></div>)}
        </div>
      </Panel>
    </div>
    <Card className="gap-0 overflow-hidden border-amber-200 dark:border-amber-900/70 p-0 shadow-sm">
      <div className="grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="bg-[linear-gradient(135deg,#451a03,#9a3412)] p-6 text-white sm:p-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ArchiveRestore className="size-6" /></span>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-200">Administrator only</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Restore a database backup</h2>
          <p className="mt-3 text-sm leading-6 text-amber-50/80">Replace all current system data with the contents of a compatible backup file.</p>
          <div className="mt-5 rounded-2xl border border-white/15 bg-black/10 p-4 text-xs leading-5 text-amber-50/85">Before restoring, the server automatically saves the current database as a recovery copy. You will be signed out after a successful restore.</div>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          {restoreState.error && <Alert variant="destructive"><TriangleAlert /><AlertDescription>{restoreState.error}</AlertDescription></Alert>}
          <div>
            <label htmlFor="restore-file" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Backup file</label>
            <Input id="restore-file" type="file" accept=".sqlite3,.sqlite,.db" disabled={restoreState.loading} onChange={(event) => { setRestoreFile(event.target.files?.[0] || null); setRestoreState({ loading: false, error: "" }); }} className="h-11 file:mr-3" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Choose a SQLite backup previously downloaded from this system.</p>
          </div>
          <div>
            <label htmlFor="restore-confirmation" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Type <span className="font-mono text-red-700 dark:text-red-300">RESTORE</span> to confirm</label>
            <Input id="restore-confirmation" value={confirmation} disabled={restoreState.loading} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} placeholder="RESTORE" />
          </div>
          <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40"><TriangleAlert className="text-amber-700 dark:text-amber-300" /><AlertDescription className="text-amber-900 dark:text-amber-200">Any records created after this backup was made will no longer be in the active database.</AlertDescription></Alert>
          <Button size="lg" variant="destructive" onClick={restore} disabled={!restoreFile || confirmation !== "RESTORE" || restoreState.loading || backupState.loading}>{restoreState.loading ? <LoaderCircle className="animate-spin" /> : <FileUp />}{restoreState.loading ? "Restoring database…" : "Restore selected backup"}</Button>
        </div>
      </div>
    </Card>
  </div>;
}
