"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Simple light/dark toggle (cycles only between light and dark)
const ThemeSwitcher = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const effective = (resolvedTheme || theme) as string | undefined;
  const isDark = effective === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Moon size={16} className="text-muted-foreground transition-transform" />
      ) : (
        <Sun size={16} className="text-muted-foreground transition-transform" />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
