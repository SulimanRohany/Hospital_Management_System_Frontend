import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  apiUrl,
  cookieOptions,
  errorMessage,
  readJson,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  REMEMBER_COOKIE
} from "@/lib/auth";

export async function POST(request) {
  let credentials;
  
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request." },
      { status: 400 }
    );
  }

  const username = String(credentials.username || "").trim();
  const password = String(credentials.password || "");
  
  if (!username || !password) {
    return NextResponse.json(
      { message: "Enter both your username and password." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(apiUrl("/api/v1/auth/token/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const payload = await readJson(response);

    if (!response.ok) {
      const message = response.status === 401
        ? "The username or password you entered is incorrect."
        : errorMessage(payload, "Unable to sign in right now.");
      
      return NextResponse.json(
        { message },
        { status: response.status }
      );
    }

    const cookieStore = await cookies();
    const remembered = Boolean(credentials.remember);
    
    cookieStore.set(ACCESS_COOKIE, payload.access, cookieOptions(ACCESS_MAX_AGE));
    cookieStore.set(REFRESH_COOKIE, payload.refresh, cookieOptions(remembered ? REFRESH_MAX_AGE : undefined));
    cookieStore.set(REMEMBER_COOKIE, remembered ? "1" : "0", cookieOptions(remembered ? REFRESH_MAX_AGE : undefined));

    return NextResponse.json({ user: payload.user });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the hospital server. Make sure the API is running." },
      { status: 503 }
    );
  }
}
