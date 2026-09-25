import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  apiUrl,
  clearAuthCookies,
  cookieOptions,
  errorMessage,
  readJson,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  REMEMBER_COOKIE
} from "@/lib/auth";

export async function POST(request) {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  
  if (!access) {
    return NextResponse.json(
      { message: "Your session has expired." },
      { status: 401 }
    );
  }

  const body = await request.json();
  
  try {
    const response = await fetch(apiUrl("/api/v1/users/change-password/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${access}`
      },
      body: JSON.stringify({
        current_password: body.currentPassword,
        new_password: body.newPassword
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await readJson(response);
      return NextResponse.json(
        { message: errorMessage(payload, "Unable to change your password.") },
        { status: response.status }
      );
    }

    const loginResponse = await fetch(apiUrl("/api/v1/auth/token/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        username: body.username,
        password: body.newPassword
      }),
      cache: "no-store",
    });

    const loginPayload = await readJson(loginResponse);
    
    if (!loginResponse.ok) {
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { message: "Password updated. Please sign in again with your new password." },
        { status: 401 }
      );
    }

    const remembered = cookieStore.get(REMEMBER_COOKIE)?.value === "1";
    cookieStore.set(ACCESS_COOKIE, loginPayload.access, cookieOptions(ACCESS_MAX_AGE));
    cookieStore.set(REFRESH_COOKIE, loginPayload.refresh, cookieOptions(remembered ? REFRESH_MAX_AGE : undefined));
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the hospital server." },
      { status: 503 }
    );
  }
}
