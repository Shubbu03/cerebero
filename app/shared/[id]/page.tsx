"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserContent } from "@/app/dashboard/page";
import axios from "axios";
import { TexturedBackground } from "@/components/background/TexturedBackground";

const COLORS = {
  silver: "#C0C0C0",
  cardinal: "#C41E3A",
};

export default function SharedContent() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<UserContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await axios.get(`/api/share/${id}`);

        if (!response) {
          throw new Error("Failed to fetch content");
        }
        setContent(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error loading content: {error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center p-4">
        <h2 className="text-xl font-semibold">Content not found</h2>
        <p>The requested content could not be found.</p>
      </div>
    );
  }

  return (
    <>
      <TexturedBackground className="min-h-screen" dotPattern>
        <header className="w-full p-4 flex justify-between items-center">
          <h1
            className="text-2xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(135deg, ${COLORS.silver} 45%, ${COLORS.cardinal} 55%)`,
              letterSpacing: "-0.02em",
            }}
          >
            Cerebero
          </h1>
        </header>
      </TexturedBackground>
    </>
  );
}
