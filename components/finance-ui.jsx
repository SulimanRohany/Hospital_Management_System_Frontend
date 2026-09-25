"use client";

import { AlertCircle, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorSummary, readableErrors } from "@/components/pharmacy-ui";

export const FINANCE_ROLES = ["administrator", "finance", "manager"];
export const FINANCE_WRITE_ROLES = ["administrator", "finance", "manager"];

export async function financeApi(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api/finance/${path}`, options);
  } catch {
    throw new Error("The hospital server could not be reached. Check your connection and try again.");
  }

  let data = null;
  if (response.status !== 204) {
    try { data = await response.json(); } catch { data = null; }
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

export function jsonOptions(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function ErrorBox({ error, retry }) {
  return (
    <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40" variant="destructive">
      <AlertCircle />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{typeof error === "string" ? error : errorSummary(error)}</span>
        {retry && <Button size="sm" variant="outline" onClick={retry}>Try again</Button>}
      </AlertDescription>
    </Alert>
  );
}

export function LoadingBlock({ label = "Loading finance records…" }) {
  return <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400"><LoaderCircle className="size-4 animate-spin" />{label}</div>;
}

export function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function nowLocalInput() {
  return toLocalInput(new Date().toISOString());
}
