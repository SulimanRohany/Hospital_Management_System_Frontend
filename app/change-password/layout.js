import { AuthProvider } from "@/components/auth-context";

export default function ChangePasswordLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
