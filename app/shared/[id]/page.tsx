"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserContent } from "@/app/dashboard/page";
import axios from "axios";

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
        console.log("ID IS::", id);
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{content.title}</h1>
      <div className="prose">{content.url}</div>
    </div>
  );
}
