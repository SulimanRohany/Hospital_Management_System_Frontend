import { NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/server-api";
import { errorMessage, readJson } from "@/lib/auth";

const ALLOWED_PATHS = new Set([
  "dashboard",
  "reports/income-trend",
  "reports/reception",
  "reports/pharmacy",
  "reports/financial",
  "reports/laboratory",
  "reports/stock",
  "database-backup",
]);

function backendPath(request, segments) {
  const path = segments.join("/");
  if (!ALLOWED_PATHS.has(path)) return null;
  return `/api/v1/${segments.map(encodeURIComponent).join("/")}/${new URL(request.url).search}`;
}

async function forward(request, context, method) {
  const { path } = await context.params;
  const target = backendPath(request, path);

  if (!target) {
    return NextResponse.json({ message: "Unsupported reports endpoint." }, { status: 404 });
  }

  try {
    const body = method === "POST" && request.headers.get("content-type")?.includes("multipart/form-data")
      ? await request.formData()
      : undefined;
    const { response, authenticated } = await authenticatedFetch(target, { method, body });
    if (!authenticated || !response) {
      return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && !contentType.includes("application/json")) {
      const headers = new Headers();
      headers.set("Content-Type", contentType || "application/octet-stream");
      const disposition = response.headers.get("content-disposition");
      if (disposition) headers.set("Content-Disposition", disposition);
      return new NextResponse(response.body, { status: response.status, headers });
    }

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
