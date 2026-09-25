"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useBranding } from "@/components/branding-context";
import { HospitalLogo } from "@/components/hospital-logo";

function Brand({ light = false }) {
  const { branding } = useBranding();
  return (
    <div className="flex items-center gap-3" data-no-translate>
      <HospitalLogo className={`brand-mark ${light ? "brand-mark-light" : ""}`} />
      <div>
        <p className={`text-[19px] font-bold leading-tight tracking-[-0.03em] ${light ? "text-white" : "text-slate-950 dark:text-slate-50"}`}>
          <bdi dir="auto">{branding.hospital_name}</bdi>
        </p>
        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${light ? "text-cyan-100/70" : "text-slate-400 dark:text-slate-500"}`}>
          Hospital systems
        </p>
      </div>
    </div>
  );
}

function FormField({ id, label, icon: Icon, trailing, ...props }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          name={id}
          className="h-12 rounded-xl pl-10 pr-11"
          {...props}
        />
        {trailing}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  const { branding } = useBranding();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
          remember
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || t("Unable to sign in."));
        return;
      }

      router.replace(data.user?.must_change_password ? "/change-password" : "/dashboard");
      router.refresh();
    } catch {
      setError(t("Unable to connect. Check your network and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section
        className="login-visual"
        aria-label={`Welcome to ${branding.hospital_name}`}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="medical-grid" />
        </div>

        <div className="relative z-10 flex h-full flex-col p-8 lg:p-12 xl:p-16">
          <div className="flex-none">
            <Brand light />
          </div>

          <div className="flex-1 flex items-center">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-cyan-50 backdrop-blur-md">
                <ShieldCheck className="size-4 text-cyan-300" />
                <span className="ml-2">Secure clinical workspace</span>
              </div>

              <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white lg:text-5xl xl:text-6xl">
                Better care starts with a clearer day.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-cyan-50/70 lg:text-lg">
                One calm, connected workspace for your patients, teams, and hospital operations.
              </p>

              <div className="mt-10 flex items-center gap-4 text-sm text-white/80">
                <AvatarGroup>
                  {['AM', 'SK', 'JR'].map((i) => (
                    <Avatar key={i} className="size-9 ring-cyan-900">
                      <AvatarFallback className="bg-cyan-50 dark:bg-cyan-950/40 text-[10px] font-bold text-cyan-800 dark:text-cyan-300">{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>

                <p>
                  <strong className="text-white">240+ care teams</strong>
                  <br />
                  <span className="text-xs text-cyan-100/55">working better together</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rtl:right-auto rtl:left-5 sm:right-8 sm:top-8 rtl:sm:right-auto rtl:sm:left-8">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[430px]">
          <div className="mb-12 lg:hidden">
            <Brand />
          </div>

          <div className="hidden lg:mb-16 lg:block">
            <Brand />
          </div>

          <div className="mb-9">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 lg:hidden">
              <Stethoscope />
            </div>

            <p className="mb-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
              Welcome back
            </p>

            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-slate-50 sm:text-[38px]">
              Sign in to your account
            </h2>

            <p className="mt-3 text-[15px] leading-6 text-slate-500 dark:text-slate-400">
              Enter your credentials to access your hospital workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              id="username"
              label="Username"
              icon={UserRound}
              autoComplete="username"
              placeholder="Enter your username"
              required
            />

            <FormField
              id="password"
              label="Password"
              icon={LockKeyhole}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              trailing={(
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              )}
            />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={setRemember}
                />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer font-medium text-slate-600 dark:text-slate-300"
                >
                  Remember me
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 font-semibold text-cyan-700 dark:text-cyan-300"
              >
                Forgot password?
              </Button>
            </div>

            <Button
              className="h-12 w-full rounded-xl bg-cyan-700 font-semibold shadow-lg shadow-cyan-700/20 hover:bg-cyan-800"
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in securely"}
              <ArrowRight />
            </Button>
          </form>

          <Card className="mt-9 bg-muted/40 py-0 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <p>
                Your session is encrypted and monitored to protect patient information.
                Never share your credentials.
              </p>
            </CardContent>
          </Card>

          <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
            Need access? Contact your hospital administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
