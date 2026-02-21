"use client";

import { usePathname } from "next/navigation";
import { FloatingDock } from "@/components/FloatingDock";
import { Header } from "@/components/Header";
import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  const excludedPaths = ["/", "/login", "/signup", "/shared"];

  const shouldExcludeLayout = excludedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (shouldExcludeLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 soft-grid opacity-40" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh] bg-[radial-gradient(circle_at_top,oklch(0.72_0.06_18_/_0.22),transparent_62%)]" />
      <Header />
      <main className="w-full lg:pl-16">{children}</main>
      <FloatingDock />
    </div>
  );
}
