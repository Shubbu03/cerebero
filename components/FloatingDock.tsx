"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendarHeart,
  IconHome2,
  IconListDetails,
  IconTags,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: IconHome2 },
  { label: "Content", href: "/content", icon: IconListDetails },
  { label: "Favourites", href: "/favourites", icon: IconCalendarHeart },
  { label: "Tags", href: "/tags", icon: IconTags },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FloatingDock() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed left-4 top-1/2 z-20 hidden -translate-y-1/2 lg:block">
        <nav className="surface-soft flex flex-col gap-2 rounded-2xl p-2 backdrop-blur">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex h-11 w-11 items-center justify-center rounded-xl transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={20} />
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-3 z-30 px-3 lg:hidden">
        <div className="surface-soft mx-auto flex h-16 max-w-md items-center justify-around rounded-2xl px-2 backdrop-blur-md">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
