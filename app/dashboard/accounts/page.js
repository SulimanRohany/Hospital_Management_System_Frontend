"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, MoreHorizontal, Plus, RefreshCw, Search, ShieldAlert, UserCheck, UserX, Users } from "lucide-react";
import { AccountDialog, ROLES } from "@/components/account-dialog";
import { useAuth } from "@/components/auth-context";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field as FormField, Modal } from "@/components/pharmacy-ui";
import { hasRole } from "@/lib/roles";

const roleNames = Object.fromEntries(ROLES);

export default function AccountsPage() {
  const { user: currentUser } = useAuth();
  
  // State declarations
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ 
    role: "", 
    department: "", 
    is_active: "" 
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ 
    count: 0, 
    next: false, 
    previous: false 
  });
  const [editing, setEditing] = useState(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    
    const params = new URLSearchParams();
    params.set("page", String(page));
    
    if (query.trim()) {
      params.set("search", query.trim());
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    
    try {
      const [userResponse, departmentResponse] = await Promise.all([
        fetch(`/api/accounts/users?${params}`),
        fetch("/api/accounts/departments?ordering=name")
      ]);
      
      const userData = await userResponse.json();
      const departmentData = await departmentResponse.json();
      
      if (!userResponse.ok) {
        throw new Error(userData.message || "Unable to load accounts.");
      }
      
      setUsers(userData.results || userData);
      setPagination({ 
        count: userData.count ?? userData.length, 
        next: Boolean(userData.next), 
        previous: Boolean(userData.previous) 
      });
      
      if (departmentResponse.ok) {
        setDepartments(departmentData.results || departmentData);
      }
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, query]);
  
  useEffect(() => {
    // Loading remote account state is the purpose of this synchronization effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!hasRole(currentUser, "administrator")) {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertDescription>
          Only system administrators can manage user accounts.
        </AlertDescription>
      </Alert>
    );
  }

  async function accountAction(target, action, body) {
    setError("");
    setNotice("");
    
    try {
      const response = await fetch(`/api/accounts/users/${target.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {})
      });
      
      const data = response.status === 204 ? null : await response.json();
      
      if (!response.ok) {
        throw new Error(data?.message || "The account could not be updated.");
      }
      
      setNotice(
        action === "reset-password" 
          ? `A temporary password was set for ${target.username}.`
          : `${target.username} was ${action}d.`
      );
      
      setResetUser(null);
      await load();
    } catch (reason) {
      setError(reason.message);
    }
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const passwordDueCount = users.filter((u) => u.must_change_password).length;
  
  return (
    <div className="operations-section">
      {/* Header section */}
      <div className="mb-7 flex flex-col justify-between gap-5 rounded-2xl border border-cyan-100 dark:border-cyan-800 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900 to-cyan-50/70 dark:to-cyan-950/40 px-5 py-6 shadow-sm sm:flex-row sm:items-end sm:px-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Administration</p>
          <h1 className="text-3xl font-semibold tracking-[-.035em] text-slate-950 dark:text-slate-50 sm:text-4xl">User accounts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Control staff identity, access, departments, and credentials.
          </p>
        </div>
        <Button 
          className="bg-cyan-700 hover:bg-cyan-800" 
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus /> Create account
        </Button>
      </div>

      {/* Alert messages */}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="mb-4">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Summary label="Visible accounts" value={users.length} icon={Users} />
        <Summary label="Active" value={activeCount} icon={UserCheck} tone="emerald" />
        <Summary label="Password change due" value={passwordDueCount} icon={KeyRound} tone="amber" />
      </div>

      {/* Main table card */}
      <Card className="gap-0 overflow-hidden border-slate-200 dark:border-slate-700 py-0 shadow-sm">
        {/* Filters section */}
        <div className="grid gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_150px_auto]">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              load();
            }} 
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              value={query} 
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }} 
              className="pl-9" 
              placeholder="Search name, username, email…" 
            />
          </form>
          
          <Filter 
            value={filters.role} 
            onChange={(value) => {
              setFilters((f) => ({ ...f, role: value }));
              setPage(1);
            }} 
            label="All roles" 
            options={ROLES} 
          />
          
          <Filter 
            value={filters.department} 
            onChange={(value) => {
              setFilters((f) => ({ ...f, department: value }));
              setPage(1);
            }} 
            label="All departments" 
            options={departments.map((d) => [String(d.id), d.name])} 
          />
          
          <Filter 
            value={filters.is_active} 
            onChange={(value) => {
              setFilters((f) => ({ ...f, is_active: value }));
              setPage(1);
            }} 
            label="Any status" 
            options={[["true", "Active"], ["false", "Inactive"]]} 
          />
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={load} 
            aria-label="Refresh"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        {/* Table section */}
        <div className="overflow-x-auto">
          <table className="operations-table w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Last login</th>
                <th className="w-14 px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center text-muted-foreground">
                    Loading accounts…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center text-muted-foreground">
                    No accounts match these filters.
                  </td>
                </tr>
              ) : (
                users.map((account) => (
                  <tr key={account.id} className="border-t hover:bg-slate-50/70 dark:bg-slate-900/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-cyan-50 dark:bg-cyan-950/40 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                            {initials(account)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{displayName(account)}</p>
                          <p className="text-xs text-muted-foreground">
                            @{account.username}
                            {account.email ? ` · ${account.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {(account.roles || [account.role]).map((role) => roleNames[role] || role).join(", ")}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {account.department_name || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge 
                          variant="secondary" 
                          className={account.is_active ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}
                        >
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {account.must_change_password && (
                          <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                            Password due
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(account.last_login)}
                    </td>
                    <td className="px-5 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${account.username}`}
                              title="Actions"
                              className="rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-900"
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 p-1.5">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditing(account);
                              setDialogOpen(true);
                            }}
                          >
                            Edit account
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(account)}>
                            <KeyRound /> Reset password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            disabled={account.id === currentUser.id}
                            variant={account.is_active ? "destructive" : "default"}
                            onClick={() => accountAction(account, account.is_active ? "deactivate" : "activate")}
                          >
                            {account.is_active ? (
                              <>
                                <UserX /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination section */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4 text-sm sm:flex-row">
          <span className="text-muted-foreground">
            {pagination.count} account{pagination.count === 1 ? "" : "s"}
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
            <span className="flex items-center px-2 text-xs text-muted-foreground">
              Page {page}
            </span>
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

      {/* Dialogs */}
      <AccountDialog 
        open={dialogOpen} 
        user={editing} 
        departments={departments} 
        onClose={() => setDialogOpen(false)} 
        onSaved={() => {
          setDialogOpen(false);
          setNotice(editing ? "Account changes saved." : "Account created successfully.");
          load();
        }} 
      />
      
      {resetUser && (
        <ResetPasswordDialog 
          user={resetUser} 
          onClose={() => setResetUser(null)} 
          onSubmit={(password) => accountAction(resetUser, "reset-password", { new_password: password })}
        />
      )}
    </div>
  );
}

function Filter({ value, onChange, label, options }) {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="h-10 rounded-md border bg-white dark:bg-slate-900 px-3 text-sm"
    >
      <option value="">{label}</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>{text}</option>
      ))}
    </select>
  );
}

function Summary({ label, value, icon: Icon, tone = "cyan" }) {
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
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ user, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  
  return (
    <Modal
      title={t(`Reset ${user.username}'s password`)}
      subtitle="Set a temporary password. They must replace it on their next sign-in."
      onClose={onClose}
    >
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }} 
        className="space-y-5"
      >
        <FormField label="Temporary password">
          <Input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            placeholder="Temporary password"
          />
        </FormField>
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400">
            Reset password
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function displayName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

function initials(user) {
  return `${user.first_name?.[0] || user.username?.[0] || "U"}${user.last_name?.[0] || ""}`.toUpperCase();
}

function formatDate(value) {
  const language = typeof document === "undefined" ? "en" : document.documentElement.lang || "en";
  const locale = language === "en" ? "en" : `${language}-AF-u-ca-gregory-nu-latn`;
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}
