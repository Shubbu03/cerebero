"use client";

import { IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { SearchBar } from "./SearchBar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";

const COLORS = {
  silver: "#C0C0C0",
  cardinal: "#C41E3A",
};

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
        <SearchBar />

        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 cursor-pointer"
          onClick={handleLogout}
        >
          <IconLogout className="h-8 w-8" />
          <span className="sr-only">Log out</span>
        </Button>

        <Avatar className="h-9 w-9 overflow-hidden rounded-full hover:border cursor-pointer">
          <AvatarImage
            src={userImage || ""}
            className="h-full w-full object-cover rounded-full"
          />
          <AvatarFallback className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-700 rounded-full">
            {username ? username.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
