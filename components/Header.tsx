"use client";

import { signOut, useSession } from "next-auth/react";
import { SearchBar } from "./SearchBar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/design/tokens";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  onSearch?: () => void;
}

export function Header({}: HeaderProps) {
  const session = useSession();
  const userImage = session?.data?.user?.image;
  const username = session?.data?.user?.name;

  const handleLogout = () => {
    signOut();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/65 bg-background/84 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1220px] items-center gap-3 px-4 sm:px-6 lg:pl-20 lg:pr-8">
        <Link href="/dashboard" className="shrink-0">
          <h1
            className="text-fluid-lg font-semibold tracking-tight text-transparent"
            style={{
              backgroundImage: `linear-gradient(140deg, ${BRAND.silver}, ${BRAND.accent})`,
              backgroundClip: "text",
            }}
          >
            {BRAND.name}
          </h1>
        </Link>
        <div className="hidden flex-1 sm:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="sm:hidden">
            <SearchBar compact />
          </div>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 overflow-hidden rounded-full border border-border/70 transition hover:border-border">
                <AvatarImage
                  src={userImage || ""}
                  className="h-full w-full object-cover rounded-full"
                />
                <AvatarFallback className="h-full w-full flex items-center justify-center bg-surface-3 text-foreground rounded-full">
                  {username ? username.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
