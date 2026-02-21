"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SessionProvider session={session}>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === "development" && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
