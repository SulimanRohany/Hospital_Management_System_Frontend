import { cookies } from "next/headers";
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

async function refreshAccess(cookieStore) {
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  
  if (!refresh) return null;
  
  const response = await fetch(apiUrl("/api/v1/auth/token/refresh/"), {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Accept: "application/json" 
    },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });
  
  if (!response.ok) return null;
  
  const tokens = await readJson(response);
  const remembered = cookieStore.get(REMEMBER_COOKIE)?.value === "1";
  
  cookieStore.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE));
  
  if (tokens.refresh) {
    cookieStore.set(
      REFRESH_COOKIE, 
      tokens.refresh, 
      cookieOptions(remembered ? REFRESH_MAX_AGE : undefined)
    );
  }
  
  return tokens.access;
}

export async function authenticatedFetch(path, options = {}) {
  const cookieStore = await cookies();
  let access = cookieStore.get(ACCESS_COOKIE)?.value;
  
  if (!access) {
    access = await refreshAccess(cookieStore);
  }
  
  if (!access) {
    return { response: null, authenticated: false };
  }

  const send = (token) => fetch(apiUrl(path), {
    ...options,
    headers: { 
      Accept: "application/json", 
      ...(options.headers || {}), 
      Authorization: `Bearer ${token}` 
    },
    cache: "no-store",
  });
  
  let response = await send(access);
  
  if (response.status === 401) {
    access = await refreshAccess(cookieStore);
    
    if (access) {
      response = await send(access);
    }
  }
  
  if (response.status === 401) {
    clearAuthCookies(cookieStore);
  }
  
  return { 
    response, 
    authenticated: response.status !== 401 
  };
}
