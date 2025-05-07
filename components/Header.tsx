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
import { COLORS } from "@/lib/colors";

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
    <header className="w-full p-4 flex justify-between items-center">
      <Link href="/dashboard">
        <h1
          className="text-2xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent cursor-pointer"
          style={{
            backgroundImage: `linear-gradient(135deg, ${COLORS.silver} 45%, ${COLORS.cardinal} 55%)`,
            letterSpacing: "-0.02em",
          }}
        >
          Cerebero
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        <SearchBar />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 overflow-hidden rounded-full hover:border cursor-pointer">
              <AvatarImage
                src={userImage || ""}
                className="h-full w-full object-cover rounded-full"
              />
              <AvatarFallback className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-700 rounded-full">
                {username ? username.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-28 text-white">
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
    </header>
  );
}
