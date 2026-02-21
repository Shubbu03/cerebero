import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("w-full py-4 sm:py-6 md:py-8", className)}>
      {children}
    </section>
  );
}

export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-fluid-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-fluid-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="sm:self-end">{action}</div> : null}
    </div>
  );
}

export function ContentGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  );
}
