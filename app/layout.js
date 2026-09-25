import "./globals.css";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/branding-context";

const themeScript = `
  (function() {
    try {
      const saved = localStorage.getItem('hospital-theme');
      const theme = saved === 'dark' || saved === 'light'
        ? saved
        : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

export const metadata = {
  title: {
    default: "Hospital +",
    template: "%s | Hospital +"
  },
  description: "A connected workspace for modern hospital operations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className="antialiased" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <BrandingProvider>
            <LanguageProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </LanguageProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
