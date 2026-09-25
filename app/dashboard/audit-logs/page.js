"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Clock3,
  Eye,
  FilePenLine,
  Globe,
  KeyRound,
  LoaderCircle,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { formatDate as formatLocalizedDate, Modal } from "@/components/pharmacy-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasRole } from "@/lib/roles";

const ACTIONS = [
  ["create", "Create"],
  ["update", "Update"],
  ["delete", "Delete"],
  ["login", "Login"],
  ["logout", "Logout"],
  ["export", "Export"],
  ["backup", "Backup"],
  ["restore", "Restore"]
];

const tones = {
  create: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  update: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  delete: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  login: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
  logout: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  export: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
  backup: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  restore: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
};

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: false, previous: false });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ ordering: "-created_at", page: String(page) });
    if (debouncedQuery) params.set("search", debouncedQuery);
    if (action) params.set("action", action);

    try {
      const response = await fetch(`/api/accounts/audit-logs?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load audit logs.");
      }

      setLogs(data.results || data);
      setPagination({
        count: data.count ?? (Array.isArray(data) ? data.length : 0),
        next: Boolean(data.next),
        previous: Boolean(data.previous)
      });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [action, debouncedQuery, page]);

  useEffect(() => {
    // Loading is the external synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const pageCounts = useMemo(() => {
    const counts = { create: 0, update: 0, delete: 0, login: 0 };
    logs.forEach((log) => {
      if (counts[log.action] != null) counts[log.action] += 1;
    });
    return counts;
  }, [logs]);

  if (!hasRole(user, "administrator")) {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertDescription>Only system administrators can view audit logs.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="operations-section">
      <div className="mb-7 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:px-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Administration</p>
        <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">Audit logs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Review authentication and data changes across the system.
        </p>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Summary label="Visible events" value={logs.length} icon={Clock3} hint={`${pagination.count} total`} />
        <Summary
          label="Creates / updates"
          value={(pageCounts.create || 0) + (pageCounts.update || 0)}
          icon={FilePenLine}
          tone="emerald"
          hint={`${pageCounts.create || 0} create · ${pageCounts.update || 0} update`}
        />
        <Summary
          label="Sign-ins / deletes"
          value={(pageCounts.login || 0) + (pageCounts.delete || 0)}
          icon={pageCounts.delete ? Trash2 : KeyRound}
          tone="amber"
          hint={`${pageCounts.login || 0} login · ${pageCounts.delete || 0} delete`}
        />
      </div>

      <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setDebouncedQuery(query.trim());
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder="Search actor, object, or IP…"
            />
          </form>

          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border bg-white dark:bg-slate-900 px-3 text-sm"
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {ACTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={load}
            aria-label="Refresh audit logs"
            title="Refresh audit logs"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="operations-table w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Object</th>
                <th className="px-5 py-3 font-semibold">Changes</th>
                <th className="px-5 py-3 font-semibold">IP address</th>
                <th className="w-14 px-5 py-3">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-14 text-center text-muted-foreground">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" />
                    Loading activity…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-14 text-center text-muted-foreground">
                    No audit activity found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const changes = parseChanges(log.changes);
                  return (
                    <tr key={log.id} className="border-t align-top hover:bg-slate-50/70 dark:bg-slate-900/70">
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                        <p className="font-medium text-slate-700 dark:text-slate-300">{formatRelative(log.created_at)}</p>
                        <p>{formatDate(log.created_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-cyan-50 dark:bg-cyan-950/40 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                              {initials(log.actor_name || log.actor_username || "System")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{log.actor_name || "System"}</p>
                            {log.actor_username && (
                              <p className="text-xs text-muted-foreground">@{log.actor_username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={tones[log.action] || ""} variant="secondary">
                          {labelForAction(log.action)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{log.object_repr || log.object_id || "—"}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {(log.content_type || "session").replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="audit-changes max-w-xs px-5 py-4 text-xs text-muted-foreground">
                        <p className="line-clamp-2">{changePreview(changes)}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {log.ip_address || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View audit details"
                          onClick={() => setSelected(log)}
                        >
                          <Eye />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm sm:flex-row">
          <span className="text-muted-foreground">
            {pagination.count} event{pagination.count === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.previous || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-xs text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.next || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {selected && <AuditDetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AuditDetailModal({ log, onClose }) {
  const { t, language } = useLanguage();
  const changes = parseChanges(log.changes);

  return (
    <Modal
      wide
      title="Audit event"
      subtitle={`${t(labelForAction(log.action))} · ${formatDate(log.created_at, true, language)}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 sm:grid-cols-2">
          <DetailCell label="Actor">
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-cyan-50 dark:bg-cyan-950/40 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  {initials(log.actor_name || log.actor_username || "System")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{log.actor_name || "System"}</p>
                {log.actor_username && (
                  <p className="truncate text-xs text-muted-foreground">@{log.actor_username}</p>
                )}
              </div>
            </div>
          </DetailCell>
          <DetailCell label="When">{formatDate(log.created_at, true, language)}</DetailCell>
          <DetailCell label="Action">
            <Badge className={tones[log.action] || ""} variant="secondary">
              {t(labelForAction(log.action))}
            </Badge>
          </DetailCell>
          <DetailCell label="Object">
            <p>{log.object_repr || log.object_id || "—"}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {(log.content_type || "session").replaceAll("_", " ")}
            </p>
          </DetailCell>
          <DetailCell label="IP address">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <Globe className="size-3.5 text-slate-400 dark:text-slate-500" />
              {log.ip_address || "—"}
            </span>
          </DetailCell>
          <DetailCell label="Object ID">
            <span className="break-all font-mono text-xs">{log.object_id || "—"}</span>
          </DetailCell>
          <DetailCell label="User agent" className="sm:col-span-2">
            <span className="inline-flex items-start gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <MonitorSmartphone className="mt-0.5 size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="break-all">{log.user_agent || "Not recorded"}</span>
            </span>
          </DetailCell>
        </dl>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Field changes</h3>
            <span className="text-xs text-muted-foreground">
              {changes.length === 0
                ? "No field details"
                : `${changes.length} field${changes.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {changes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 px-4 py-8 text-center text-sm text-muted-foreground">
              This event has no structured field changes to display.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:grid">
                <span>Field</span>
                <span>Before</span>
                <span className="sr-only">to</span>
                <span>After</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {changes.map((change) => (
                  <li
                    key={change.field}
                    className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start"
                  >
                    <p className="text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">
                      {change.field.replaceAll("_", " ")}
                    </p>
                    <ChangeValue label="Before" value={change.from} tone="rose" />
                    <ArrowRight className="mt-1 hidden size-4 text-slate-300 sm:block" />
                    <ChangeValue label="After" value={change.to} tone="emerald" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

function ChangeValue({ label, value, tone }) {
  const colors = {
    rose: "border-rose-100 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300",
    emerald: "border-emerald-100 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300"
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[tone]}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70 sm:hidden">{label}</p>
      <p className="break-words text-sm leading-5">{formatChangeValue(value)}</p>
    </div>
  );
}

function DetailCell({ label, children, className = "" }) {
  const { t } = useLanguage();
  return (
    <div className={`bg-white dark:bg-slate-900 p-4 ${className}`}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t(label)}</dt>
      <dd className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

function Summary({ label, value, icon: Icon, tone = "cyan", hint }) {
  const colors = {
    cyan: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
  };

  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4 px-5">
        <span className={`flex size-10 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function parseChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];

  return Object.entries(changes).map(([field, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const from = value.from ?? value.old ?? value.previous ?? null;
      const to = value.to ?? value.new ?? value.next ?? null;
      if (from != null || to != null || "changed" in value || "reset" in value) {
        return {
          field,
          from: from ?? ("changed" in value || "reset" in value ? "—" : null),
          to: to ?? (value.changed ? "Changed" : value.reset ? "Reset" : null)
        };
      }
      return { field, from: null, to: value };
    }
    return { field, from: null, to: value };
  });
}

function changePreview(changes) {
  if (changes.length === 0) return "—";
  if (changes.length === 1) {
    const [change] = changes;
    if (change.from != null && change.to != null) {
      return `${change.field.replaceAll("_", " ")}: ${formatChangeValue(change.from)} → ${formatChangeValue(change.to)}`;
    }
    return `${change.field.replaceAll("_", " ")} updated`;
  }
  return `${changes.length} fields changed`;
}

function formatChangeValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function labelForAction(action) {
  return ACTIONS.find(([value]) => value === action)?.[1] || action;
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(value, withSeconds = false, languageOverride) {
  return formatLocalizedDate(value, withSeconds, languageOverride);
}

function formatRelative(value) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const formatter = new Intl.RelativeTimeFormat(language === "en" ? "en" : `${language}-AF`, { numeric: "auto" });

  if (absMs < minute) return "Just now";
  if (absMs < hour) return formatter.format(Math.round(diffMs / minute), "minute");
  if (absMs < day) return formatter.format(Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return formatter.format(Math.round(diffMs / day), "day");
  return formatDate(value);
}
