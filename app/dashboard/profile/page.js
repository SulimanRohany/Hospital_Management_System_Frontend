"use client";

import Link from "next/link";
import { Building2, KeyRound, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user } = useAuth();
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const initials = `${user.first_name?.[0] || user.username?.[0] || "U"}${user.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="operations-section mx-auto max-w-5xl">
      <div className="relative mb-5 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#073747] via-[#0b5262] to-[#0f7181] p-6 text-white shadow-[0_22px_55px_rgb(8_47_59_/_0.2)] sm:p-8">
        <div className="absolute -right-14 -top-20 size-64 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-20 border-4 border-white/15 shadow-xl">
            <AvatarFallback className="bg-white/15 text-xl font-bold text-white backdrop-blur">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200">My hospital identity</p><h1 className="text-3xl font-semibold tracking-[-.04em]">{name}</h1><p className="mt-1 text-sm text-cyan-50/70">@{user.username}</p>
            <div className="mt-3 flex gap-2">
              <Badge className="border-white/10 bg-white/10 capitalize text-white" variant="secondary">
                {user.role?.replaceAll("_", " ")}
              </Badge>
              <Badge className={user.is_active ? "border-emerald-300/20 bg-emerald-300/15 text-emerald-100" : "bg-white/10 text-white"} variant="secondary">
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 backdrop-blur"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-cyan-200">Security status</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-emerald-300" />Account protected</p></div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-white/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 shadow-[0_12px_35px_rgb(15_23_42_/_0.055)] ring-1 ring-slate-200/70 dark:ring-slate-700/70">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Contact your administrator to change these fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail icon={UserRound} label="Username" value={user.username} />
            <Detail icon={Mail} label="Email" value={user.email || "Not provided"} />
            <Detail icon={Phone} label="Phone" value={user.phone || "Not provided"} />
            <Detail icon={Building2} label="Department" value={user.department_name || "Not assigned"} />
          </CardContent>
        </Card>

        <Card className="border-white/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 shadow-[0_12px_35px_rgb(15_23_42_/_0.055)] ring-1 ring-slate-200/70 dark:ring-slate-700/70">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Use a strong password unique to this system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-100">
              <ShieldCheck />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Changing your password ends the current access token and securely signs you back in.
            </p>
            <Button 
              className="mt-5 bg-cyan-700 hover:bg-cyan-800" 
              render={<Link href="/change-password" />}
            >
              <KeyRound /> Change password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
