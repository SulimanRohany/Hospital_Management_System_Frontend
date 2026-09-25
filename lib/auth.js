const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const ACCESS_COOKIE = "medora_access";
export const REFRESH_COOKIE = "medora_refresh";
export const REMEMBER_COOKIE = "medora_remember";
export const ACCESS_MAX_AGE = 30 * 60;
export const REFRESH_MAX_AGE = 24 * 60 * 60;

export function apiUrl(path) {
  const base = (process.env.HOSPITAL_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  return `${base}${path}`;
}

export function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    priority: "high",
    ...(maxAge ? { maxAge } : {}),
  };
}

export async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function errorMessage(payload, fallback = "Something went wrong. Please try again.") {
  const errors = payload?.errors ?? payload;
  
  if (!errors) return fallback;
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) return errors[0] || fallback;
  
  const priorityKeys = [
    "detail", 
    "non_field_errors", 
    "username", 
    "password", 
    "current_password", 
    "new_password",
    "backup"
  ];
  
  for (const key of priorityKeys) {
    const value = errors[key];
    
    if (Array.isArray(value) && value[0]) {
      return value[0];
    }
    
    if (typeof value === "string") {
      return value;
    }
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value[0]) {
      return typeof value[0] === "string" 
        ? value[0] 
        : errorMessage(value[0], fallback);
    }
    
    if (typeof value === "string") {
      return value;
    }
    
    if (value && typeof value === "object") {
      const nested = errorMessage(value, "");
      
      if (nested) {
        return nested;
      }
    }
  }
  
  return fallback;
}

export function clearAuthCookies(cookieStore) {
  const cookieNames = [ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE];
  
  for (const name of cookieNames) {
    cookieStore.set(name, "", cookieOptions(1));
  }
}
