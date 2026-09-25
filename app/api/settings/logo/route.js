import { apiUrl } from "@/lib/auth";

export async function GET() {
  try {
    const response = await fetch(apiUrl("/api/v1/settings/logo/"), { cache: "no-store" });
    if (!response.ok) return new Response(null, { status: response.status });
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
