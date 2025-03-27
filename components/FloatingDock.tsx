import React from "react";
import { FloatingDockComponent } from "@/components/ui/floating-dock";
import { IconBrandGithub, IconBrandX, IconHome } from "@tabler/icons-react";

export function FloatingDock() {
  const links = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/dashboard",
    },
    {
      title: "Twitter",
      icon: (
        <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "https://x.com/blackbaloon03",
    },
    {
      title: "GitHub",
      icon: (
        <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "https://github.com/Shubbu03",
    },
  ];
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
      <FloatingDockComponent
        desktopClassName=""
        mobileClassName=""
        items={links}
      />
    </div>
  );
}
