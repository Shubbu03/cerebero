"use client";

import { useSession } from "next-auth/react";
import { ContentDetailCard } from "@/components/ContentDetailCard";
import { notify } from "@/lib/notify";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { apiDelete, apiGet } from "@/lib/api/client";
import { UserContentListResponse } from "@/lib/api/types";
import {
  PageContainer,
  PageShell,
  SectionHeader,
} from "@/components/layout/PageShell";
import { UserContent } from "@/app/dashboard/page";

const fetchFavouriteContent = async (): Promise<UserContent[]> => {
  try {
    const response = await apiGet<UserContentListResponse>("/api/view-favourites");
    return response.data || [];
  } catch (error) {
    notify("Error occured while fetcing favourites", "error");
    throw error;
  }
};

export default function Favourites() {
  const session = useSession();
  const queryClient = useQueryClient();

  const favData = useSuspenseQuery({
    queryKey: ["favourites", session.data?.user?.id],
    queryFn: fetchFavouriteContent,
  });

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  const handleContentDelete = async (id: string) => {
    try {
      await apiDelete(`/api/delete-content/${id}`);
      await queryClient.invalidateQueries({
        queryKey: ["favourites", session.data?.user?.id],
      });
      notify("Content deleted successfully", "success");
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
            title={firstName ? `${firstName}'s favourites` : "Favourites"}
            subtitle="Pinned references you return to frequently."
          />
          <ContentDetailCard
            content={favData.data}
            isLoading={favData.isLoading}
            username={firstName}
            origin="Favourites"
            onDelete={handleContentDelete}
          />
        </PageContainer>
      </PageShell>
    </>
  );
}
