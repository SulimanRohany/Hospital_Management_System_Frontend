import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  apiUrl,
  clearAuthCookies,
  cookieOptions,
  readJson,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  REMEMBER_COOKIE
} from "@/lib/auth";

async function getUser(accessToken) {
  return fetch(apiUrl("/api/v1/users/me/"), {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    },
    cache: "no-store",
  });
}

export async function GET() {
  const cookieStore = await cookies();
  let access = cookieStore.get(ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!access && !refresh) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  try {
    let userResponse = access ? await getUser(access) : null;

    if (!userResponse?.ok && refresh) {
      const refreshResponse = await fetch(apiUrl("/api/v1/auth/token/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });

      if (refreshResponse.ok) {
        const tokens = await readJson(refreshResponse);
        access = tokens.access;
        const remembered = cookieStore.get(REMEMBER_COOKIE)?.value === "1";
        
        cookieStore.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
        
        if (tokens.refresh) {
          cookieStore.set(
            REFRESH_COOKIE,
            tokens.refresh,
            cookieOptions(remembered ? REFRESH_MAX_AGE : undefined)
          );
        }
        
        userResponse = await getUser(access);
      }
    }

    if (!userResponse?.ok) {
      clearAuthCookies(cookieStore);
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: await readJson(userResponse)
    });
  } catch {
    return NextResponse.json(
      { message: "The hospital server is temporarily unavailable." },
      { status: 503 }
    );
  }
}
