"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-provider";
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

function getPasswordStrength(password = "") {
  if (!password) {
    return { score: 0, label: "No password yet", tone: "bg-slate-200 dark:bg-slate-700" };
  }

  const checks = [
    password.length >= 8,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    !/^\d+$/.test(password),
    !/\s/.test(password)
  ];

  const score = checks.filter(Boolean).length;

  if (score <= 2) {
    return { score, label: "Weak", tone: "bg-red-400" };
  }
  if (score === 3 || score === 4) {
    return { score, label: "Good", tone: "bg-amber-400" };
  }
  return { score, label: "Strong", tone: "bg-emerald-500" };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const strength = useMemo(() => getPasswordStrength(passwordValues.newPassword), [passwordValues.newPassword]);
  const strengthPercentage = Math.min((strength.score / 5) * 100, 100);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const currentPassword = passwordValues.currentPassword;
    const newPassword = passwordValues.newPassword;
    const confirmPassword = passwordValues.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || /^\d+$/.test(newPassword)) {
      setError("Use a stronger password with at least 8 characters and a mix of letters and numbers.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          username: user?.username || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to update your password.");
        return;
      }

      setUser({ ...user, must_change_password: false });
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const requirements = [
    "At least 8 characters",
    "Includes a letter",
    "Includes a number",
    "Different from current password"
  ];

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="Reset your password">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="medical-grid" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-12 xl:p-16">
          <Brand light />

          <div className="max-w-xl pb-4">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-cyan-50 backdrop-blur-md">
              <ShieldCheck className="size-4 text-cyan-300" />
              Security check required
            </div>

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white lg:text-5xl xl:text-6xl">
              Protect patient data with a stronger password.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-cyan-50/70 lg:text-lg">
              Update your credentials before continuing to the hospital workspace so every patient record stays secure.
            </p>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sm text-cyan-50/90">
                <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Password reset required</p>
                  <p className="text-xs text-cyan-50/60">This update helps keep the system compliant and protected.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="absolute right-5 top-5 z-20 rtl:right-auto rtl:left-5 sm:right-8 sm:top-8 rtl:sm:right-auto rtl:sm:left-8">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-108">
          <div className="mb-12 lg:hidden">
            <Brand />
          </div>

          <div className="hidden lg:mb-12 lg:block">
            <Brand />
          </div>

          <div className="mb-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 lg:hidden">
              <Stethoscope />
            </div>

            <p className="mb-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">Protect your account</p>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-slate-50 sm:text-[38px]">
              Create a new password
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-500 dark:text-slate-400">
              Your administrator issued a temporary password. Replace it before continuing to your workflow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <PasswordField
              id="currentPassword"
              label="Current password"
              show={showCurrent}
              setShow={setShowCurrent}
              value={passwordValues.currentPassword}
              onChange={(value) => setPasswordValues((prev) => ({ ...prev, currentPassword: value }))}
            />

            <PasswordField
              id="newPassword"
              label="New password"
              show={showNew}
              setShow={setShowNew}
              value={passwordValues.newPassword}
              onChange={(value) => setPasswordValues((prev) => ({ ...prev, newPassword: value }))}
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              show={showConfirm}
              setShow={setShowConfirm}
              value={passwordValues.confirmPassword}
              onChange={(value) => setPasswordValues((prev) => ({ ...prev, confirmPassword: value }))}
            />

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Password strength</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{strength.label}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${strength.tone}`}
                  style={{ width: `${strength.score === 0 ? 8 : strengthPercentage}%` }}
                />
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                {requirements.map((rule) => (
                  <span key={rule} className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300">
                      {passwordValues.newPassword && rule.toLowerCase().includes("at least 8") ? (
                        passwordValues.newPassword.length >= 8 ? <Check className="size-3" /> : null
                      ) : rule.toLowerCase().includes("includes a letter") ? (
                        /[A-Za-z]/.test(passwordValues.newPassword) ? <Check className="size-3" /> : null
                      ) : rule.toLowerCase().includes("includes a number") ? (
                        /\d/.test(passwordValues.newPassword) ? <Check className="size-3" /> : null
                      ) : rule.toLowerCase().includes("different") ? (
                        passwordValues.newPassword && passwordValues.currentPassword && passwordValues.newPassword !== passwordValues.currentPassword ? <Check className="size-3" /> : null
                      ) : null}
                    </span>
                    {rule}
                  </span>
                ))}
              </div>
            </div>

            <Button
              className="h-12 w-full rounded-xl bg-cyan-700 font-semibold shadow-lg shadow-cyan-700/20 hover:bg-cyan-800"
              disabled={loading}
              type="submit"
            >
              {loading ? "Updating password..." : "Update password"}
              <ArrowRight />
            </Button>
          </form>

          <Card className="mt-8 bg-muted/40 py-0 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <p>
                Your password is sent through an encrypted connection and is never stored by the frontend.
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" />
              Secure reset flow
            </span>
            <Button type="button" onClick={logout} variant="ghost" size="sm" className="h-auto px-2 py-1 text-cyan-700 dark:text-cyan-300">
              Sign out
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PasswordField({ id, label, show, setShow, value, onChange }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl pl-10 pr-11"
          type={show ? "text" : "password"}
          autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
          placeholder={id === "currentPassword" ? "Enter your current password" : "Create a strong password"}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
}
