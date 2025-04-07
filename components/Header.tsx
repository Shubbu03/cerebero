"use client";

import { useState, useEffect } from "react";
import { IconSearch, IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
} from "@/components/ui/command";

const COLORS = {
  silver: "#C0C0C0",
  cardinal: "#C41E3A",
};

interface HeaderProps {
  onSearch?: () => void;
}

export function Header({}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = () => {
    signOut();
  };

  return (
    <>
      <header className="w-full p-4 flex justify-between items-center">
        <h1
          className="text-2xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent cursor-pointer"
          style={{
            backgroundImage: `linear-gradient(135deg, ${COLORS.silver} 45%, ${COLORS.cardinal} 55%)`,
            letterSpacing: "-0.02em",
          }}
        >
          Cerebero
        </h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-white border-white/20 bg-white/10 hover:bg-white/20"
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch className="h-4 w-4 mr-2" />
            Search...
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 cursor-pointer"
            onClick={handleLogout}
          >
            <IconLogout className="h-5 w-5" />
            <span className="sr-only">Log out</span>
          </Button>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search content..." />
        <CommandList></CommandList>
      </CommandDialog>
    </>
  );
}
