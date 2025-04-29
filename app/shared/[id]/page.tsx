"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { UserContent } from "@/app/dashboard/page";
import axios from "axios";
import Loading from "@/components/ui/loading";
import { TexturedBackground } from "@/components/background/TexturedBackground";

export default function SharedContent() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<UserContent | null>(null);
  const [userDetails, setUserDetails] = useState({
    email: "",
    name: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{
    message: string;
    status?: number;
  } | null>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await axios.get(`/api/share/${id}`);
        setContent(response.data);
        //for fetching user details-
        const user = await axios.get(`/api/get-user/${response.data.user_id}`);
        setUserDetails({
          email: user.data.data.email,
          name: user.data.data.name,
        });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          setError({
            message: err.response.data?.message || "An error occurred",
            status: err.response.status,
          });
        } else {
          setError({
            message: err instanceof Error ? err.message : "An error occurred",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [id]);

  const getUserInitials = () => {
    if (!userDetails.name) return "";
    return userDetails.name
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase();
  };

  return (
    <TexturedBackground className="min-h-screen " dotPattern>
    <main className="container mx-4 px-4 py-8 max-w-3xl text-white">
      {isLoading ? (
        <div className="flex justify-start mt-8">
          <Loading />
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4 text-left">
          {error.status === 404 ? (
            <p>
              This content is not available. It may have been deleted or is not
              shared publicly.
            </p>
          ) : (
            <p>Error loading content: {error.message}</p>
          )}
        </div>
      ) : !content ? (
        <div className="text-left p-4">
          <h2 className="text-xl font-semibold">Content not found</h2>
          <p>The requested content could not be found.</p>
        </div>
      ) : !content.is_shared ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4 text-left">
          <p>This content is not shared and cannot be viewed.</p>
        </div>
      ) : (
        <article className="text-left">
          <div className="flex flex-col gap-6 mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {content.title}
            </h1>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-800 dark:text-gray-200 font-semibold text-lg">
                {getUserInitials()}
              </div>
              <div>
                <p className="font-medium">{userDetails.name}</p>
                <div className="flex items-center text-gray-500 dark:text-gray-800 text-sm">
                  <span>
                    {new Date(content.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
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
    </main>
    </TexturedBackground>
  );
}
