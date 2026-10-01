"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let saved: string | null = null;
      try { saved = localStorage.getItem("theme"); } catch { /* unavailable */ }
      const next = saved === "dark" || (saved !== "light" && media.matches);
      document.documentElement.classList.toggle("dark", next);
      setDark(next);
    }
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? dark : false}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={`tap relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        dark ? "bg-gray-900" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-ios transition-transform duration-200 ${
          dark ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      >
        {dark ? (
          <Moon size={13} className="text-gray-700" />
        ) : (
          <Sun size={13} className="text-amber-500" />
        )}
      </span>
    </button>
  );
}
