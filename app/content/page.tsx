"use client";

import { useSession } from "next-auth/react";
import { UserContent } from "../dashboard/page";
import { ContentDetailCard } from "@/components/ContentDetailCard";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { apiDelete, apiGet } from "@/lib/api/client";
import { UserContentListResponse } from "@/lib/api/types";
import {
  PageContainer,
  PageShell,
  SectionHeader,
} from "@/components/layout/PageShell";

const fetchAllContent = async (): Promise<UserContent[]> => {
  try {
    const response = await apiGet<UserContentListResponse>("/api/get-content");
    return response.data || [];
  } catch (error) {
    console.error("Error occured:", error);
    notify("Error occured while fetching content", "error");
    throw error;
  }
};

export default function AllContent() {
  const session = useSession();

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const queryClient = useQueryClient();

  const allContent = useSuspenseQuery({
    queryKey: ["allContent"],
    queryFn: fetchAllContent,
  });

  const handleContentDelete = async (id: string) => {
    try {
      await apiDelete(`/api/delete-content/${id}`);
      await queryClient.invalidateQueries({
        queryKey: ["allContent"],
      });
      notify("Content deleted successfully", "success");
      await allContent.refetch();
    } catch (error) {
      notify("Error deleting content", "error");
      throw error;
    }
  };

  return (
    <>
      <PageShell>
        <PageContainer>
          <SectionHeader
            title="All Content"
            subtitle="A complete, chronologically ordered view of everything you saved."
          />
          <ContentDetailCard
            content={allContent.data}
            isLoading={allContent.isLoading}
            username={firstName}
            origin="All_Content"
            onDelete={handleContentDelete}
          />
        </PageContainer>
      </PageShell>
    </>
  );
}
