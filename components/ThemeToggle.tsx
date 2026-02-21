"use client";

import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hasMounted = useHasMounted();

  // Avoid SSR/CSR icon mismatch while theme is unresolved on first render.
  if (!hasMounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full border border-border/60 bg-card/65 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label="Toggle theme"
      >
        <IconMoon size={18} />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-10 w-10 rounded-full border border-border/60 bg-card/65 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </Button>
  );
}
