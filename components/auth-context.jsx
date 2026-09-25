"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HospitalLogo } from "@/components/hospital-logo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace(`/?next=${encodeURIComponent(pathname)}`);
          return null;
        }
        
        if (!response.ok) {
          throw new Error("Session check failed");
        }
        
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        
        setUser(data.user);
        
        if (data.user?.must_change_password && pathname !== "/change-password") {
          router.replace("/change-password");
        }
      })
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    
    return () => { 
      active = false; 
    };
  }, [pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="auth-loading">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <HospitalLogo className="brand-mark" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <p className="text-center text-xs text-muted-foreground">
              Securing your workspace...
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  if (!user) {
    return (
      <main className="auth-loading">
        <Card className="max-w-sm">
          <CardContent className="space-y-4 text-center">
            <p>
              Unable to verify your session. Please try again.
            </p>
            <Button onClick={() => location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  
  return value;
}
