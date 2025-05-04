"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { UserContent } from "../dashboard/page";
import axios from "axios";
import { ContentDetailCard } from "@/components/ContentDetailCard";

export default function AllContent() {
  const [allContent, setAllContent] = useState<UserContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const session = useSession();

  const fullName = session.data?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "";

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/get-content");
      if (response) {
        if (response && response.data) {
          setAllContent(response.data.data || []);
        } else {
          setAllContent([]);
        }
      }
    } catch (error) {
      console.error("Error occured:", error);
      setAllContent([]);
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
      fetchAllContent();
    }
  };

  return (
    <>
      <main className="p-4 md:p-6 text-white">
        <ContentDetailCard
          content={allContent}
          isLoading={isLoading}
          username={firstName}
          origin="All_Content"
          onDelete={handleContentDelete}
        />
      </main>
    </>
  );
}
