"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(next: Theme) {
  const el = document.documentElement;
  el.classList.toggle("dark", next === "dark");
  el.classList.toggle("light", next === "light");
  try {
    localStorage.theme = next;
  } catch {
    /* storage unavailable */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const setTheme = (next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggleTheme };
}
