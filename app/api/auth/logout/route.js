import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  apiUrl,
  clearAuthCookies,
  REFRESH_COOKIE
} from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;

  try {
    if (access && refresh) {
      await fetch(apiUrl("/api/v1/users/logout/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access}`
        },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    }
  } finally {
    clearAuthCookies(cookieStore);
  }

  return NextResponse.json({ success: true });
}
