"use client";

import { DynamicHeader } from "@/components/DynamicHeader";
import axios from "axios";
import { useSession } from "next-auth/react";
import { ContentDetailCard } from "@/components/ContentDetailCard";
import { notify } from "@/lib/notify";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

const fetchFavouriteContent = async () => {
  try {
    const response = await axios.get("/api/view-favourites");
    if (response) {
      if (response && response.data) {
        return response.data.data || [];
      } else {
        return [];
      }
    }
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
      await axios.delete(`/api/delete-content/${id}`);
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
      <main className="p-4 md:p-6 text-white">
        <div className="flex justify-center">
          <DynamicHeader userName={firstName || ""} />
        </div>
        <ContentDetailCard
          content={favData.data}
          isLoading={favData.isLoading}
          username={firstName}
          origin="Favourites"
          onDelete={handleContentDelete}
        />
      </main>
    </>
  );
}
