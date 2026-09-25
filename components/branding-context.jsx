"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT_BRANDING = {
  hospital_name: "Hospital +",
  has_logo: false,
  logo_url: null,
  updated_at: null,
};

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setBranding({ ...DEFAULT_BRANDING, ...data });
    } catch {
      // Keep the safe default identity while the backend is unavailable.
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data) setBranding({ ...DEFAULT_BRANDING, ...data });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = branding.hospital_name;
  }, [branding.hospital_name]);

  const value = useMemo(
    () => ({ branding, setBranding, refreshBranding }),
    [branding, refreshBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const value = useContext(BrandingContext);
  if (!value) throw new Error("useBranding must be used inside BrandingProvider");
  return value;
}
