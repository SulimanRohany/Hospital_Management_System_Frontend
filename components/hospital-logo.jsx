"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { useBranding } from "@/components/branding-context";

export function HospitalLogo({ className = "", iconClassName = "", children }) {
  const { branding } = useBranding();
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = branding.logo_url && failedUrl !== branding.logo_url;

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      {showImage ? (
        // The same-origin route securely proxies the administrator-uploaded logo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logo_url}
          alt={`${branding.hospital_name} logo`}
          className="size-full object-contain"
          onError={() => setFailedUrl(branding.logo_url)}
        />
      ) : (
        <Activity aria-hidden="true" className={iconClassName} />
      )}
      {children}
    </span>
  );
}
