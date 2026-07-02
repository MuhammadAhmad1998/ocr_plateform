"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono",
          "border-[rgb(var(--border-strong))] bg-transparent text-[rgb(var(--text-2))]",
          className
        )}
        aria-label="Toggle theme"
      >
        <span>◐</span> <span className="hidden sm:inline">Theme</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors",
        "border-[rgb(var(--border-strong))] bg-transparent text-[rgb(var(--text-2))]",
        "hover:text-[rgb(var(--text-1))]",
        className
      )}
    >
      <span aria-hidden>{isDark ? "◑" : "◐"}</span>
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
