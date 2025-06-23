"use client";

import { useSession } from "next-auth/react";
import { UserContent } from "../dashboard/page";
import axios from "axios";
import { ContentDetailCard } from "@/components/ContentDetailCard";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";

const fetchAllContent = async (): Promise<UserContent[]> => {
  try {
    const response = await axios.get("/api/get-content");
    if (response && response.data) {
      return response.data.data || [];
    } else {
      return [];
    }
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
      await axios.delete(`/api/delete-content/${id}`);
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
      <main className="p-4 md:p-6 text-white">
        <ContentDetailCard
          content={allContent.data}
          isLoading={allContent.isLoading}
          username={firstName}
          origin="All_Content"
          onDelete={handleContentDelete}
        />
      </main>
    </>
  );
}
