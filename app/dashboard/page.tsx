"use client";

import { TexturedBackground } from "@/components/background/TexturedBackground";
import { FloatingDock } from "@/components/FloatingDock";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import AddContentModal from "@/components/AddContentModal";
import { signOut } from "next-auth/react";

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <TexturedBackground className="min-h-screen" dotPattern>
        <h2 className="text-white">dashboard</h2>
        <button onClick={() => signOut()}>Sign out</button>
        <FloatingDock />
        <Button
          className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 bg-accent-foreground text-white cursor-pointer transition-transform duration-300 ease-in-out 
                     hover:scale-125"
          onClick={() => setModalOpen(true)}
        >
          <IconPlus className="h-6 w-6" />
        </Button>
        {modalOpen && (
          <AddContentModal open={modalOpen} onOpenChange={setModalOpen} />
        )}
      </TexturedBackground>
    </>
  );
}
