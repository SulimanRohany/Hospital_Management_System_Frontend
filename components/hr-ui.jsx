"use client";

export { Field, Modal, Select, Textarea, formatDate, inputError, money, readableErrors, rows, today } from "@/components/pharmacy-ui";

export const HR_ROLES = ["administrator", "hr", "manager"];
export const HR_WRITE_ROLES = ["administrator", "hr"];

export async function hrApi(path, options = {}) {
  let response;
  try { response = await fetch(`/api/hr/${path}`, options); }
  catch { throw new Error("The hospital server could not be reached."); }
  let data = null;
  if (response.status !== 204) data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || "The request could not be completed.");
    error.status = response.status; error.fields = data?.errors ?? data;
    throw error;
  }
  return data;
}

export function labelize(value) {
  if (value == null || value === "") return "—";
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
}
