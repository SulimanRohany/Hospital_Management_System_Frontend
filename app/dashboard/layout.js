import { AuthProvider } from "@/components/auth-context";
import { DashboardShell } from "@/components/dashboard-shell";

export default function DashboardLayout({ children }) {
  return <AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider>;
}
