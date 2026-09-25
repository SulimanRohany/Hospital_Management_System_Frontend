"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Microscope,
  Stethoscope,
  BriefcaseBusiness,
  Building2,
  Landmark,
  Pill,
  ChartNoAxesCombined,
  Database,
  ScrollText,
  Settings,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasRole, userRoles } from "@/lib/roles";
import { useBranding } from "@/components/branding-context";
import { HospitalLogo } from "@/components/hospital-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const coreLinks = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/dashboard/patients", icon: UsersRound },
  { label: "Reception", href: "/dashboard/reception", icon: ClipboardList },
];

const adminLinks = [
  { label: "Hospital settings", href: "/dashboard/settings", icon: Settings },
  { label: "User accounts", href: "/dashboard/accounts", icon: UserCog },
  { label: "Audit logs", href: "/dashboard/audit-logs", icon: ScrollText },
  { label: "Backup", href: "/dashboard/backup", icon: Database },
];

function isLinkActive(pathname, href) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function NavigationGroup({ label, links, pathname, direction }) {
  return (
    <SidebarGroup className="px-3 py-2 group-data-[collapsible=icon]:px-2">
      <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {links.map(({ label: itemLabel, href, icon: Icon, disabled }) => {
            const active = !disabled && isLinkActive(pathname, href);

            return (
              <SidebarMenuItem key={itemLabel}>
                <SidebarMenuButton
                  render={disabled ? undefined : <Link href={href} />}
                  disabled={disabled}
                  isActive={active}
                  tooltip={{
                    children: disabled ? `${itemLabel} · coming soon` : itemLabel,
                    side: direction === "rtl" ? "left" : "right",
                  }}
                  className={`hospital-nav-item relative h-11 gap-3 rounded-xl px-3 text-[13px] transition-all duration-200 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! ${active ? "font-semibold" : "font-medium text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"}`}
                >
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-white/15 text-white dark:bg-cyan-900/70 dark:text-cyan-200" : "text-slate-400 dark:text-slate-500 group-hover/menu-button:bg-white group-hover/menu-button:text-[#0f7181] dark:group-hover/menu-button:bg-slate-800 dark:group-hover/menu-button:text-cyan-300"}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="group-data-[collapsible=icon]:hidden">{itemLabel}</span>
                  {active && <span className="absolute end-2.5 size-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_rgb(165_243_252_/_0.7)] dark:bg-cyan-400 dark:shadow-none group-data-[collapsible=icon]:hidden" />}
                  {disabled && (
                    <span className="ms-auto rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-data-[collapsible=icon]:hidden">
                      Soon
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardShell({ children }) {
  const { direction, t } = useLanguage();
  const { branding } = useBranding();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isAdmin = hasRole(user, "administrator");
  const workspaceLinks = coreLinks.filter(({ href }) => {
    if (href === "/dashboard") return true;
    if (href === "/dashboard/reception") return hasRole(user, "administrator", "reception", "manager");
    return hasRole(user, "administrator", "reception", "laboratory", "manager", "clinician", "pharmacy");
  });
  const clinicalLinks = [
    ...(hasRole(user, "clinician")
      ? [{ label: "Provider workspace", href: "/dashboard/provider", icon: Stethoscope }]
      : []),
    ...(hasRole(user, "administrator", "reception", "laboratory", "pharmacy", "finance", "manager", "hr", "clinician")
      ? [{ label: "Departments", href: "/dashboard/departments", icon: Building2 }]
      : []),
    ...(hasRole(user, "administrator", "hr", "manager")
      ? [{ label: "Human resources", href: "/dashboard/hr", icon: BriefcaseBusiness }]
      : []),
    ...(hasRole(user, "administrator", "pharmacy", "manager", "finance")
      ? [{ label: "Pharmacy", href: "/dashboard/pharmacy", icon: Pill }]
      : []),
    ...(hasRole(user, "administrator", "finance", "manager")
      ? [{ label: "Finance", href: "/dashboard/finance", icon: Landmark }]
      : []),
    ...(hasRole(user, "administrator", "laboratory", "manager", "clinician", "reception")
      ? [{ label: "Laboratory", href: "/dashboard/laboratory", icon: Microscope }]
      : []),
  ];
  const reportLinks = hasRole(user, "administrator", "reception", "pharmacy", "finance", "manager", "laboratory")
    ? [{ label: "Reports", href: "/dashboard/reports", icon: ChartNoAxesCombined }]
    : [];
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const initials = `${user.first_name?.[0] || user.username?.[0] || "U"}${user.last_name?.[0] || ""}`.toUpperCase();
  const role = userRoles(user).map((item) => t(item.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))).join(" · ");
  const allLinks = [...workspaceLinks, ...clinicalLinks, ...reportLinks, ...(isAdmin ? adminLinks : [])];
  const currentPage = t(allLinks.find(({ href }) => isLinkActive(pathname, href))?.label || "Workspace");

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "17rem",
        "--sidebar-width-icon": "4.5rem",
        "--sidebar": "#f1f6f8",
        "--sidebar-border": "#dbe6ea",
      }}
    >
      <Sidebar
        side={direction === "rtl" ? "right" : "left"}
        dir={direction}
        collapsible="icon"
        className={direction === "rtl"
          ? "border-l border-[#dbe6ea] shadow-[-8px_0_30px_rgb(15_23_42_/_0.025)]"
          : "border-r border-[#dbe6ea] shadow-[8px_0_30px_rgb(15_23_42_/_0.025)]"}
      >
        <SidebarHeader className="h-20 shrink-0 justify-center border-b border-[#dbe6ea] bg-[#f8fbfc] px-5 group-data-[collapsible=icon]:px-3">
          <Link href="/dashboard" className="flex items-center gap-3.5 overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">
            <HospitalLogo className="size-10 rounded-xl bg-gradient-to-br from-[#0e8795] to-[#155e75] p-1.5 text-white shadow-[0_7px_18px_rgb(14_116_144_/_0.2)] ring-1 ring-white/30" iconClassName="size-5 stroke-[2.5]">
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#f8fbfc] bg-emerald-400" />
            </HospitalLogo>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden" data-no-translate>
              <bdi dir="auto" className="block truncate text-[17px] font-bold tracking-[-0.035em] text-slate-900 dark:text-slate-100">{branding.hospital_name}</bdi>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-[#4f8792]">Hospital system</span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-2 bg-gradient-to-b from-[#f4f8fa] to-[#edf4f6] py-4">
          <NavigationGroup label="Workspace" links={workspaceLinks} pathname={pathname} direction={direction} />
          {clinicalLinks.length > 0 && <NavigationGroup label="Clinical services" links={clinicalLinks} pathname={pathname} direction={direction} />}
          {reportLinks.length > 0 && <NavigationGroup label="Intelligence" links={reportLinks} pathname={pathname} direction={direction} />}
          {isAdmin && <NavigationGroup label="Administration" links={adminLinks} pathname={pathname} direction={direction} />}
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[radial-gradient(circle_at_92%_4%,rgba(207,250,254,.5),transparent_22%),linear-gradient(180deg,#f7fafc_0%,#f3f6f9_100%)]">
        <header dir={direction} className="sticky top-0 z-20 flex h-20 shrink-0 items-center border-b border-[#dbe6ea] bg-[#f8fbfc]/95 px-4 shadow-[0_1px_0_rgb(15_23_42_/_0.02)] backdrop-blur-xl md:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900" />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100 sm:text-base">{currentPage}</h1>
                <span className="hidden items-center gap-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 sm:flex">
                  <Sparkles className="size-2.5" /> Live
                </span>
              </div>
              <p className="mt-0.5 hidden text-start text-[11px] text-slate-500 dark:text-slate-400 sm:block">
                <bdi dir="auto" data-no-translate>{branding.hospital_name}</bdi>{" "}<span>Clinical operations</span>
              </p>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-3">
            <ThemeToggle className="border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800" />
            <LanguageSwitcher compact />
            <div className="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="h-11 gap-2.5 rounded-xl px-1.5 pe-2.5 hover:bg-slate-100 dark:hover:bg-slate-800" />}>
                <Avatar className="size-8.5 ring-2 ring-slate-100 dark:ring-slate-800">
                  <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-950 text-[10px] font-bold text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 text-start md:block">
                  <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                  <span className="block truncate text-[10px] font-normal text-slate-500 dark:text-slate-400">{role}</span>
                </span>
                <ChevronDown className="hidden size-3.5 text-slate-400 dark:text-slate-500 md:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard/profile" />}><Settings /> Profile & security</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={logout}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1540px] p-4 pb-14 md:p-7 lg:p-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
