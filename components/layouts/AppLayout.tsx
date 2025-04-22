"use client";

import { usePathname } from "next/navigation";
import { TexturedBackground } from "@/components/background/TexturedBackground";
import { FloatingDock } from "@/components/FloatingDock";
import { Header } from "@/components/Header";
import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  const excludedPaths = ["/", "/login", "/signup"];

  const shouldExcludeLayout = excludedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (shouldExcludeLayout) {
    return <>{children}</>;
  }

  return (
    <TexturedBackground className="min-h-screen" dotPattern>
      <Header />
      <FloatingDock />
      {children}
    </TexturedBackground>
  );
}
