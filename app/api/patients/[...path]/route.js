import { NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/server-api";
import { errorMessage, readJson } from "@/lib/auth";

const ALLOWED_ROOTS = new Set(["patients", "patient-notes"]);

function backendPath(request, segments) {
  if (!segments.length || !ALLOWED_ROOTS.has(segments[0])) return null;
  return `/api/v1/${segments.map(encodeURIComponent).join("/")}/${new URL(request.url).search}`;
}

async function forward(request, context, method) {
  const { path } = await context.params;
  const target = backendPath(request, path);
  if (!target) return NextResponse.json({ message: "Unsupported patient endpoint." }, { status: 404 });

  const body = ["GET", "HEAD"].includes(method) ? undefined : await request.text();
  try {
    const { response, authenticated } = await authenticatedFetch(target, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      ...(body ? { body } : {}),
    });
    if (!authenticated || !response) {
      return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
    }
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const payload = await readJson(response);
    if (!response.ok) {
      return NextResponse.json({
        message: errorMessage(payload),
        errors: payload?.errors ?? payload,
        status_code: response.status,
      }, { status: response.status });
    }
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Cannot reach the hospital server." }, { status: 503 });
  }
}

export const GET = (request, context) => forward(request, context, "GET");
export const POST = (request, context) => forward(request, context, "POST");
export const PATCH = (request, context) => forward(request, context, "PATCH");
export const DELETE = (request, context) => forward(request, context, "DELETE");
