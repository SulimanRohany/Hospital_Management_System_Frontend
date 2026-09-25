"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field as FormField, Modal } from "@/components/pharmacy-ui";

export const ROLES = [
  ["administrator", "System administrator"],
  ["reception", "Reception"],
  ["pharmacy", "Pharmacy"],
  ["laboratory", "Laboratory"],
  ["finance", "Finance"],
  ["manager", "Manager"],
  ["hr", "Human resources"],
  ["clinician", "Clinician"],
];

export function AccountDialog({ open, user, departments, onClose, onSaved }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function close() {
    setError("");
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      ["username", "first_name", "last_name", "email", "phone", "department", "password"]
        .map((key) => [key, form.get(key)])
    );
    payload.roles = form.getAll("roles");

    payload.department = payload.department || null;

    if (user) {
      delete payload.password;
    }

    try {
      const response = await fetch(`/api/accounts/users${user ? `/${user.id}` : ""}`, {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = response.status === 204 ? null : await response.json();

      if (!response.ok) {
        setError(data?.message || "Unable to save this account.");
        return;
      }

      onSaved(data);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={user ? "Edit account" : "Create account"}
      subtitle={user ? "Update identity, contact, role, or department." : "Add a staff member with a temporary password."}
      onClose={close}
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="first_name" label="First name" defaultValue={user?.first_name} />
          <Field name="last_name" label="Last name" defaultValue={user?.last_name} />
          <Field name="username" label="Username" defaultValue={user?.username} required autoComplete="off" />
          <Field name="email" label="Email" defaultValue={user?.email} type="email" />
          <Field name="phone" label="Phone" defaultValue={user?.phone} />
          <div className="sm:col-span-2">
            <RoleFields user={user} />
          </div>
          <div className="sm:col-span-2">
            <SelectField
              name="department"
              label="Department"
              defaultValue={user?.department || ""}
              options={[["", "No department"], ...departments.map((department) => [department.id, department.name])]}
            />
          </div>
          {!user && (
            <div className="sm:col-span-2">
              <Field
                name="password"
                label="Temporary password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                hint="Use at least 8 characters and avoid common or entirely numeric passwords. The user must change it on first sign-in."
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-5">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800" disabled={saving}>
            {saving ? "Saving..." : user ? "Save changes" : "Create account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RoleFields({ user }) {
  const existingAdministrator = user?.role === "administrator" || user?.roles?.includes("administrator");
  const initial = existingAdministrator
    ? ROLES.map(([value]) => value)
    : (user?.roles || [user?.role || "reception"]);
  const [selected, setSelected] = useState(initial);
  const administrator = selected.includes("administrator");

  function toggle(value, checked) {
    if (value === "administrator") {
      setSelected(checked ? ROLES.map(([role]) => role) : ["reception"]);
      return;
    }
    setSelected((current) => checked ? [...current, value] : current.filter((role) => role !== value));
  }

  return (
    <FormField
      label="Section access"
      hint={administrator
        ? "System administrators always have access to every section. This access cannot be customized."
        : "Select every section this user may access. Permissions are combined."}
    >
      <div className="grid gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 sm:grid-cols-2">
        {ROLES.map(([value, text]) => {
          const locked = existingAdministrator || (administrator && value !== "administrator");
          return (
            <label key={value} className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${locked ? "cursor-not-allowed bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
              <input
                type="checkbox"
                name="roles"
                value={value}
                checked={selected.includes(value)}
                disabled={locked}
                onChange={(event) => toggle(value, event.target.checked)}
                className="size-4 rounded border-slate-300 dark:border-slate-600 accent-cyan-700"
              />
              {text}
            </label>
          );
        })}
      </div>
      {existingAdministrator && selected.map((role) => <input key={role} type="hidden" name="roles" value={role} />)}
      {!existingAdministrator && administrator && selected.filter((role) => role !== "administrator").map((role) => <input key={role} type="hidden" name="roles" value={role} />)}
    </FormField>
  );
}

function Field({ name, label, hint, ...props }) {
  return (
    <FormField label={label} hint={hint}>
      <Input id={name} name={name} {...props} />
    </FormField>
  );
}

function SelectField({ name, label, options, ...props }) {
  return (
    <FormField label={label}>
      <select
        id={name}
        name={name}
        className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-3 focus:ring-cyan-600/10"
        {...props}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </FormField>
  );
}
