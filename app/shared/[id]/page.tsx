"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserContent } from "@/app/dashboard/page";
import axios from "axios";
import { TexturedBackground } from "@/components/background/TexturedBackground";
import Loading from "@/components/ui/loading";

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

  const formattedDate = new Date(content.created_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

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
        {isLoading ? (
          <Loading />
        ) : (
          <article className="container mx-4 px-4 py-8 max-w-4xl text-white">
            <div className="flex flex-col gap-6 mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {content.title}
              </h1>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <div>
                  <p className="font-medium">Author</p>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                    <span>{formattedDate}</span>
                    <span className="mx-2">•</span>
                    <span className="capitalize">{content.type}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Last Updated
                  </p>
                  <p className="font-medium">
                    {new Date(content.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {content.url && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Source URL
                    </p>
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {content.url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {content.type === "document" && content.body && (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {content.body}
              </div>
            )}
          </article>
        )}
      </TexturedBackground>
    </>
  );
}
