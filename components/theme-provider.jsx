"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const ThemeContext = createContext(null);

function getTheme() {
  const stored = window.localStorage.getItem("hospital-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback) {
  window.addEventListener("hospital-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("hospital-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  function toggleTheme() {
    const next = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem("hospital-theme", next);
    window.dispatchEvent(new Event("hospital-theme-change"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
