import { NextResponse } from "next/server";
import { authenticatedFetch } from "@/lib/server-api";
import { errorMessage, readJson } from "@/lib/auth";

const ALLOWED_ROOTS = new Set(["departments", "services"]);

async function forward(request, context, method) {
  const { path } = await context.params;
  if (!path?.length || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json({ message: "Unsupported departments endpoint." }, { status: 404 });
  }

  const target = `/api/v1/${path.map(encodeURIComponent).join("/")}/${new URL(request.url).search}`;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type");

  try {
    const { response, authenticated } = await authenticatedFetch(target, {
      method,
      ...(body ? { body, headers: contentType ? { "Content-Type": contentType } : {} } : {}),
    });
    if (!authenticated || !response) return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const payload = await readJson(response);
    if (!response.ok) return NextResponse.json({ message: errorMessage(payload), errors: payload?.errors ?? payload }, { status: response.status });
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Cannot reach the hospital server." }, { status: 503 });
  }
}

export const GET = (request, context) => forward(request, context, "GET");
export const POST = (request, context) => forward(request, context, "POST");
export const PATCH = (request, context) => forward(request, context, "PATCH");
