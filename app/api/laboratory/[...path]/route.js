import { NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/server-api";
import { errorMessage, readJson } from "@/lib/auth";

const ALLOWED = new Set(["lab-tests", "lab-orders", "patients", "receptions", "services"]);
function target(request, parts) {
  if (!parts.length || !ALLOWED.has(parts[0])) return null;
  return `/api/v1/${parts.map(encodeURIComponent).join("/")}/${new URL(request.url).search}`;
}
async function forward(request, context, method) {
  const { path } = await context.params;
  const url = target(request, path);
  if (!url) return NextResponse.json({ message: "Unsupported laboratory endpoint." }, { status: 404 });
  const body = ["GET", "HEAD"].includes(method) ? undefined : await request.text();
  try {
    const { response, authenticated } = await authenticatedFetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, ...(body ? { body } : {}) });
    if (!authenticated || !response) return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const payload = await readJson(response);
    if (!response.ok) return NextResponse.json({ message: errorMessage(payload), errors: payload?.errors ?? payload, status_code: response.status }, { status: response.status });
    return NextResponse.json(payload, { status: response.status });
  } catch { return NextResponse.json({ message: "Cannot reach the hospital server." }, { status: 503 }); }
}
export const GET = (r, c) => forward(r, c, "GET");
export const POST = (r, c) => forward(r, c, "POST");
export const PATCH = (r, c) => forward(r, c, "PATCH");
export const DELETE = (r, c) => forward(r, c, "DELETE");
