import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

type ModuleContext = "social" | "academic" | "career" | "premium" | "neutral";

interface ThemeContextType {
  module: ModuleContext;
  setModule: (m: ModuleContext) => void;
  isDark: boolean;
  toggleDark: () => void;
  accent: string;
  accentBg: string;
  accentText: string;
}

const MODULE_ACCENTS: Record<ModuleContext, { bg: string; text: string; raw: string }> = {
  social:   { bg: "bg-brand-social",   text: "text-brand-social",   raw: "#e1306c" },
  academic: { bg: "bg-brand-academic", text: "text-brand-academic", raw: "#7289da" },
  career:   { bg: "bg-brand-career",   text: "text-brand-career",   raw: "#0077b5" },
  premium:  { bg: "bg-brand-premium",  text: "text-brand-premium",  raw: "#ffb703" },
  neutral:  { bg: "bg-neutral-600",    text: "text-neutral-400",    raw: "#6c757d" },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [module, setModule] = useState<ModuleContext>("social");
  const [isDark, setIsDark] = useState(true);

  const value = useMemo(() => {
    const a = MODULE_ACCENTS[module];
    return {
      module,
      setModule,
      isDark,
      toggleDark: () => setIsDark((p) => !p),
      accent: a.raw,
      accentBg: a.bg,
      accentText: a.text,
    };
  }, [module, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function resolveModuleFromRoute(route: string): ModuleContext {
  if (route.includes("spaces") || route.includes("chat")) return "academic";
  if (route.includes("feed") || route.includes("home")) return "social";
  if (route.includes("career") || route.includes("market") || route.includes("match")) return "career";
  if (route.includes("premium") || route.includes("billing")) return "premium";
  return "neutral";
}
