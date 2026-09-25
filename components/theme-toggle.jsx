"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={`shrink-0 rounded-xl ${className}`}
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
