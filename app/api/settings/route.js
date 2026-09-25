import { NextResponse } from "next/server";
import { apiUrl, errorMessage, readJson } from "@/lib/auth";
import { authenticatedFetch } from "@/lib/server-api";

function frontendPayload(payload) {
  return {
    ...payload,
    logo_url: payload?.has_logo
      ? `/api/settings/logo?v=${encodeURIComponent(payload.updated_at || "current")}`
      : null,
  };
}

export async function GET() {
  try {
    const response = await fetch(apiUrl("/api/v1/settings/"), { cache: "no-store" });
    const payload = await readJson(response);
    if (!response.ok) return NextResponse.json({ message: errorMessage(payload) }, { status: response.status });
    return NextResponse.json(frontendPayload(payload));
  } catch {
    return NextResponse.json({ message: "Cannot reach the hospital server." }, { status: 503 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.formData();
    const { response, authenticated } = await authenticatedFetch("/api/v1/settings/", { method: "PATCH", body });
    if (!authenticated || !response) {
      return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
    }
    const payload = await readJson(response);
    if (!response.ok) {
      return NextResponse.json({ message: errorMessage(payload), errors: payload }, { status: response.status });
    }
    return NextResponse.json(frontendPayload(payload));
  } catch {
    return NextResponse.json({ message: "Cannot reach the hospital server." }, { status: 503 });
  }
}
