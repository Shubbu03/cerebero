"use client";

import { useEffect, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import AddContentModal from "@/components/AddContentModal";
import axios from "axios";
import AddHintArrow from "@/components/background/AddButtonGuide";
import { useSession } from "next-auth/react";
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
  is_favourite: boolean;
  updated_at: string;
}

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [userContent, setUserContent] = useState<UserContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const showAddHint = !isLoading && userContent.length === 0;

  return (
    <>
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
        <div className="flex justify-center">
          <DynamicHeader userName={firstName || ""} />
        </div>
        <RecentsCard
          content={userContent}
          isLoading={isLoading}
          username={firstName}
        />
      </main>

      {modalOpen && (
        <AddContentModal open={modalOpen} onOpenChange={setModalOpen} />
      )}
    </>
  );
}
