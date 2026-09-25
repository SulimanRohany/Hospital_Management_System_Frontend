"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ImagePlus, LoaderCircle, Pencil, Save, ShieldAlert, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useBranding } from "@/components/branding-context";
import { HospitalLogo } from "@/components/hospital-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasRole } from "@/lib/roles";
import { useLanguage } from "@/components/language-provider";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { branding, setBranding } = useBranding();
  const [hospitalName, setHospitalName] = useState(null);
  const [logo, setLogo] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const canManage = hasRole(user, "administrator");

  const previewUrl = useMemo(() => logo ? URL.createObjectURL(logo) : null, [logo]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (!canManage) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <ShieldAlert />
        <AlertTitle>{t("Administrator access required")}</AlertTitle>
        <AlertDescription>{t("Only the system administrator can change hospital identity settings.")}</AlertDescription>
      </Alert>
    );
  }

  async function save(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage(null);
    const form = new FormData();
    form.set("hospital_name", (hospitalName ?? branding.hospital_name).trim());
    if (logo) form.set("logo", logo);
    if (removeLogo) form.set("remove_logo", "true");

    try {
      const response = await fetch("/api/settings", { method: "PATCH", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save settings.");
      setBranding(data);
      setHospitalName(null);
      setLogo(null);
      setRemoveLogo(false);
      setEditing(false);
      setMessage({ type: "success", text: "Hospital identity updated across the system." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to save settings." });
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setHospitalName(null);
    setLogo(null);
    setRemoveLogo(false);
    setMessage(null);
    setEditing(false);
  }

  return (
    <div className="operations-section mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">{t("System administration")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-slate-950 dark:text-slate-50">{t("Hospital settings")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("Review the official identity used throughout the workspace and on printed receipts.")}
        </p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-5">
          {message.type === "success" ? <CheckCircle2 /> : <ShieldAlert />}
          <AlertDescription>{t(message.text)}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="border-white/80 bg-white/90 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/90">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{t("Hospital identity")}</CardTitle>
                <CardDescription className="mt-1">
                  {t(editing ? "Update the official name or logo, then save your changes." : "The identity currently used throughout the system.")}
                </CardDescription>
              </div>
              {!editing && (
                <Button type="button" variant="outline" onClick={() => { setMessage(null); setEditing(true); }}>
                  <Pencil /> {t("Edit identity")}
                </Button>
              )}
            </div>
          </CardHeader>

          {editing ? (
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hospital-name">{t("Hospital name")}</Label>
                <Input
                  id="hospital-name"
                  value={hospitalName ?? branding.hospital_name}
                  onChange={(event) => setHospitalName(event.target.value)}
                  maxLength={150}
                  required
                  placeholder={t("Enter the hospital name")}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">{t("This name appears in navigation, browser titles, sign-in pages, and receipts.")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospital-logo">{t("Hospital logo")}</Label>
                <label htmlFor="hospital-logo" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 transition-colors hover:border-cyan-400 hover:bg-cyan-50/40 dark:border-slate-700 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/20">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><ImagePlus className="size-5" /></span>
                  <span><strong className="block text-sm">{t("Choose a logo")}</strong><small className="text-muted-foreground">{t("PNG, JPG, or WebP up to 2 MB")}</small></span>
                </label>
                <Input
                  id="hospital-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    setLogo(event.target.files?.[0] || null);
                    setRemoveLogo(false);
                  }}
                />
                {logo && <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{t("Selected")}: <span data-no-translate>{logo.name}</span></p>}
                {branding.has_logo && !removeLogo && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setLogo(null); setRemoveLogo(true); }}>
                    <Trash2 /> {t("Remove current logo")}
                  </Button>
                )}
                {removeLogo && <p className="text-xs text-amber-700 dark:text-amber-300">{t("The current logo will be removed when you save.")}</p>}
              </div>

              <div className="flex justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}><X /> {t("Cancel")}</Button>
                <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800" disabled={saving || !(hospitalName ?? branding.hospital_name).trim()}>
                  {saving ? <LoaderCircle className="animate-spin" /> : <Save />} {t(saving ? "Saving…" : "Save changes")}
                </Button>
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-medium text-muted-foreground">{t("Hospital name")}</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50" data-no-translate>{branding.hospital_name}</p>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <HospitalLogo className="size-14 rounded-xl bg-white p-1.5 text-cyan-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" iconClassName="size-6" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("Hospital logo")}</p>
                  <p className="mt-1 text-sm font-semibold">{t(branding.has_logo ? "Custom logo uploaded" : "Default medical logo")}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="h-fit overflow-hidden border-cyan-900 bg-gradient-to-br from-[#073747] via-[#0b5262] to-[#0f7181] text-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">{t(editing ? "Live preview" : "Current identity")}</CardTitle>
            <CardDescription className="text-cyan-50/65">{t("Your primary system identity")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-white/10 bg-white/[.08] p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={t("New logo preview")} className="size-16 rounded-xl bg-white object-contain p-1.5" />
                ) : removeLogo ? (
                  <span className="flex size-16 items-center justify-center rounded-xl bg-white/15"><Building2 className="size-7" /></span>
                ) : (
                  <HospitalLogo className="size-16 rounded-xl bg-white p-1.5 text-cyan-800" iconClassName="size-7" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold" data-no-translate>{hospitalName ?? branding.hospital_name}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-100/65">{t("Hospital system")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
