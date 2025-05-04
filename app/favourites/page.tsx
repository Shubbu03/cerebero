"use client";

import { DynamicHeader } from "@/components/DynamicHeader";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ContentDetailCard } from "@/components/ContentDetailCard";

export default function Favourites() {
  const [favData, setFavData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const session = useSession();

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  useEffect(() => {
    fetchFavouriteContent();
  }, []);

  const fetchFavouriteContent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/view-favourites");
      if (response) {
        if (response && response.data) {
          setFavData(response.data.data || []);
        } else {
          setFavData([]);
        }
      }
    } catch (error) {
      console.error("Error occured:", error);
      setFavData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentDelete = async (id: string) => {
    try {
      await axios.delete(`/api/delete-content/${id}`);
    } catch (error) {
      console.error("Error deleting content:", error);
    } finally {
      fetchFavouriteContent();
    }
  };

  return (
    <>
      <main className="p-4 md:p-6 text-white">
        <div className="flex justify-center">
          <DynamicHeader userName={firstName || ""} />
        </div>
        <ContentDetailCard
          content={favData}
          isLoading={isLoading}
          username={firstName}
          origin="Favourites"
          onDelete={handleContentDelete}
        />
      </main>
    </>
  );
}
