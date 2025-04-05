"use client";

import { useEffect, useState } from "react";
import { TexturedBackground } from "@/components/background/TexturedBackground";
import { FloatingDock } from "@/components/FloatingDock";
import { IconPlus, IconSearch, IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import AddContentModal from "@/components/AddContentModal";
import axios from "axios";
import {
  CommandDialog,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import AddHintArrow from "@/components/background/AddButtonGuide";
import { signOut, useSession } from "next-auth/react";
import { DynamicHeader } from "@/components/DynamicHeader";
import { RecentsCard } from "@/components/RecentsCard";

export interface UserContent {
  body: string;
  id: string;
  created_at: string;
  is_shared: boolean;
  share_id: string;
  title: string;
  type: string;
  url: string;
  user_id: string;
}

const COLORS = {
  silver: "#C0C0C0",
  cardinal: "#C41E3A",
};

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [userContent, setUserContent] = useState<UserContent[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const session = useSession();
  useEffect(() => {
    fetchUserContent();
  }, []);

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  useEffect(() => {
    if (!modalOpen) {
      setTimeout(fetchUserContent, 100);
    }
  }, [modalOpen]);

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

  const fetchUserContent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<{ data: UserContent[] }>(
        "/api/get-content"
      );
      if (response && response.data) {
        setUserContent(response.data.data || []);
      } else {
        setUserContent([]);
      }
    } catch (error) {
      console.error("Error fetching user content::", error);
      setUserContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const showAddHint = !isLoading && userContent.length === 0;

  return (
    <>
      <TexturedBackground className="min-h-screen" dotPattern>
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

        <FloatingDock />

        {showAddHint && <AddHintArrow />}

        <Button
          id="add-content-button"
          className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 bg-accent-foreground text-white cursor-pointer transition-transform duration-300 ease-in-out
                     hover:scale-125"
          onClick={() => setModalOpen(true)}
          aria-label="Add new content"
        >
          <IconPlus className="h-6 w-6" />
        </Button>

        <main className="p-4 md:p-6 text-white">
          {isLoading && <p>Loading content...</p>}
          <div className="flex justify-center">
            <DynamicHeader userName={firstName || ""} />
          </div>
          <RecentsCard content={userContent} isLoading={isLoading} username={firstName}/>
        </main>

        {modalOpen && (
          <AddContentModal open={modalOpen} onOpenChange={setModalOpen} />
        )}

        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Search content..." />
          <CommandList>{/* Command items will go here */}</CommandList>
        </CommandDialog>
      </TexturedBackground>
    </>
  );
}
