"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import AddContentModal from "@/components/AddContentModal";
import axios from "axios";
import AddHintArrow from "@/components/background/AddButtonGuide";
import { useSession } from "next-auth/react";
import { DynamicHeader } from "@/components/DynamicHeader";
import { ContentCard } from "@/components/ContentCard";
import TodoCard from "@/components/TodoCard";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";

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

const fetchUserContent = async () => {
  try {
    const response = await axios.get<{ data: UserContent[] }>(
      "/api/get-content"
    );
    if (response && response.data) {
      return response.data.data || [];
    } else {
      return [];
    }
  } catch (error) {
    notify("Error fetching user content", "error");
    throw error;
  }
};

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const session = useSession();
  const userID = session.data?.user.id;
  const queryClient = useQueryClient();

  const userContent = useSuspenseQuery({
    queryKey: ["userContent", userID, "favourites"],
    queryFn: fetchUserContent,
  });

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  const showAddHint = !userContent.isLoading && userContent.data.length === 0;

  const handleContentDelete = async (id: string) => {
    try {
      await axios.delete(`/api/delete-content/${id}`);
      await queryClient.invalidateQueries({
        queryKey: ["userContent", userID],
      });
      notify("Content deleted successfully", "success");
    } catch (error) {
      notify("Error deleting content", "error");
      throw error;
    }
  };

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
        <ContentCard
          content={userContent.data}
          isLoading={userContent.isLoading}
          username={firstName}
          origin="Recents"
          onDelete={handleContentDelete}
        />
        <TodoCard />
      </main>

      <AddContentModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
