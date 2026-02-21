"use client";

import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import AddContentModal from "@/components/AddContentModal";
import AddHintArrow from "@/components/background/AddButtonGuide";
import { useSession } from "next-auth/react";
import { ContentCard } from "@/components/ContentCard";
import TodoCard from "@/components/TodoCard";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { apiDelete, apiGet } from "@/lib/api/client";
import { UserContentDTO, UserContentListResponse } from "@/lib/api/types";
import {
  PageContainer,
  PageShell,
  SectionHeader,
} from "@/components/layout/PageShell";

export type UserContent = UserContentDTO;

const fetchUserContent = async () => {
  try {
    const response = await apiGet<UserContentListResponse>("/api/get-content");
    if (response) {
      return response.data || [];
    }
    return [];
  } catch (error) {
    notify("Error fetching user content", "error");
    throw error;
  }
};

const getGreeting = (name: string) => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
};

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const session = useSession();
  const userID = session.data?.user.id;
  const queryClient = useQueryClient();

  const userContent = useSuspenseQuery({
    queryKey: ["userContent", userID],
    queryFn: fetchUserContent,
  });

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  const showAddHint = !userContent.isLoading && userContent.data.length === 0;

  const handleContentDelete = async (id: string) => {
    try {
      await apiDelete(`/api/delete-content/${id}`);
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
        className="fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full shadow-lg sm:bottom-6 sm:right-6"
        onClick={() => setModalOpen(true)}
        aria-label="Add new content"
      >
        <IconPlus className="h-6 w-6" />
      </Button>

      <PageShell>
        <PageContainer>
          <SectionHeader
            title={firstName ? getGreeting(firstName) : "Your workspace"}
            subtitle="Capture, review, and organize your saved context."
          />
          <ContentCard
            content={userContent.data}
            isLoading={userContent.isLoading}
            username={firstName}
            origin="Recents"
            onDelete={handleContentDelete}
          />
          <TodoCard />
        </PageContainer>
      </PageShell>

      <AddContentModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
