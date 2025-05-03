"use client";

import Link from "next/link";
import {
  IconFileText,
  IconBrandYoutube,
  IconLink,
  IconCircleArrowUpRight,
  IconHeartFilled,
  IconUser,
  IconBrandX,
  IconFileDescription,
  IconWorld,
  IconBrandGithub,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";
import { useState } from "react";
import Pagination from "./Pagination";
import { formatDate } from "@/lib/format-date";
import { useRouter } from "next/navigation";

type Origin = "Favourites" | "All_Content";

interface ContentCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
  origin: Origin;
}

const ITEMS_PER_PAGE = 10;

const getYouTubeVideoId = (url: string): string => {
  try {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : "";
  } catch (err) {
    console.error("Error extracting YouTube video ID", err);
    return "";
  }
};

const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.split(".")[0];
  } catch (err) {
    console.error("Error fetching data:", err);
    return "";
  }
};

export function ContentDetailCard({
  content,
  isLoading,
  username,
  origin,
}: ContentCardProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const contentTypes = [
    {
      value: "document",
      label: "Document",
      icon: IconFileText,
      color: "bg-blue-700",
    },
    {
      value: "tweet",
      label: "Tweet",
      icon: IconBrandX,
      color: "bg-black-600",
    },
    {
      value: "youtube",
      label: "YouTube",
      icon: IconBrandYoutube,
      color: "bg-red-600",
    },
    {
      value: "link",
      label: "Link",
      icon: IconLink,
      color: "bg-purple-600",
    },
  ];

  const recentItems = [...content].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.ceil(recentItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = recentItems.slice(startIndex, endIndex);

  const handleCardClick = (contentId: string, event: React.MouseEvent) => {
    if (
      (event.target as HTMLElement).closest("a") ||
      (event.target as HTMLElement).closest("iframe")
    ) {
      return;
    }

    router.push(`/content/${contentId}`);
  };

  const getCardBgColor = (type: string) => {
    switch (type) {
      case "youtube":
        return "bg-gradient-to-br from-red-900/30 to-zinc-900";
      case "tweet":
        return "bg-gradient-to-br from-black-900/30 to-zinc-900";
      case "link":
        return "bg-gradient-to-br from-purple-900/30 to-zinc-900";
      case "document":
        return "bg-gradient-to-br from-blue-900/30 to-zinc-900";
      default:
        return "bg-gradient-to-br from-zinc-800 to-zinc-900";
    }
  };

  const renderPreview = (item: UserContent) => {
    const { type, url, title, body } = item;

    switch (type) {
      case "youtube":
        return (
          <div className="relative w-full h-32 bg-black">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"></div>
            {url && (
              <div className="w-full h-full">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                    url
                  )}?controls=1&showinfo=0`}
                  title={title || "YouTube video"}
                  className="w-full h-full object-cover opacity-90"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );

      case "tweet":
        return (
          <div className="relative w-full h-32 bg-gradient-to-b from-black-900/50 to-zinc-900 flex items-center justify-center">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/twitter-pattern.png')] opacity-5"></div>
            <div className="flex flex-col items-center justify-center p-3 text-center">
              <IconBrandX size={24} className="text-black-400 mb-2" />
              {body ? (
                <p className="text-xs text-zinc-300 font-medium line-clamp-3">
                  {body}
                </p>
              ) : null}
            </div>
          </div>
        );

      case "document":
        return (
          <div className="relative w-full h-32 bg-gradient-to-b from-blue-900/50 to-zinc-900 flex items-center justify-center">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/document-pattern.png')] opacity-5"></div>
            <div className="flex flex-col items-center justify-center p-3">
              <IconFileDescription size={24} className="text-blue-400 mb-2" />
              {title ? (
                <p className="text-xs text-zinc-300 font-medium line-clamp-2">
                  {title}
                </p>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  Untitled document
                </p>
              )}
              {body && (
                <p className="text-xs text-zinc-400 line-clamp-1 mt-1">
                  {body}
                </p>
              )}
            </div>
          </div>
        );

      case "link":
        return (
          <div className="relative w-full h-32 bg-gradient-to-b from-purple-900/50 to-zinc-900 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center p-3 text-center">
              {url && getDomainFromUrl(url) === "github" ? (
                <IconBrandGithub size={24} className="text-purple-400 mb-2" />
              ) : (
                <IconWorld size={24} className="text-purple-400 mb-2" />
              )}
              {url ? (
                <p className="text-xs text-zinc-300 font-medium">
                  {getDomainFromUrl(url)}
                </p>
              ) : (
                <p className="text-xs text-zinc-400 italic">No URL provided</p>
              )}
              {title && (
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                  {title}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-32 bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center">
            <IconFileText size={24} className="text-zinc-400" />
          </div>
        );
    }
  };

  return (
    <>
      <div className="mt-4 p-3 md:p-5 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          {origin === "Favourites" ? (
            <div className="flex items-center gap-1">
              <IconHeartFilled className="h-4 w-4" />
              <h3 className="text-lg font-semibold text-white">Favourites</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconUser className="h-4 w-4 text-white" />
              <h3 className="text-lg font-semibold text-white">Your Content</h3>
            </div>
          )}

          {!isLoading && recentItems.length > 0 && (
            <div className="text-xs text-zinc-400">
              {recentItems.length} {recentItems.length === 1 ? "item" : "items"}
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-gray-400 text-center py-3">Loading items...</p>
        ) : recentItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentItems.map((item) => {
                const contentType =
                  contentTypes.find((type) => type.value === item.type) ||
                  contentTypes[0];
                const IconComponent = contentType.icon;

                return (
                  <div
                    key={item.id}
                    className={`${getCardBgColor(
                      item.type
                    )} rounded-xl overflow-hidden shadow-lg border border-zinc-800/50 hover:border-zinc-700/80 transition-all duration-200 ease-in-out cursor-pointer flex flex-col h-full`}
                    onClick={(e) => handleCardClick(item.id, e)}
                  >
                    {renderPreview(item)}

                    <div className="p-3 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center ${contentType.color}`}
                          >
                            <IconComponent size={14} className="text-white" />
                          </div>
                          <span className="text-xs text-zinc-400 font-medium">
                            {contentType.label}
                          </span>
                        </div>

                        {item.type !== "document" && item.url && (
                          <Link
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-zinc-700/50 p-1 rounded-full transition-colors"
                          >
                            <IconCircleArrowUpRight
                              size={14}
                              className="text-zinc-400"
                            />
                          </Link>
                        )}
                      </div>

                      <h3 className="text-white font-medium text-xs mt-1 mb-1.5 line-clamp-1">
                        {item.title || "Untitled"}
                      </h3>

                      {item.body && item.type !== "tweet" && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
                          {item.body}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800/70">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                            <span className="text-xs font-medium text-zinc-300">
                              {username
                                ? username.charAt(0).toUpperCase()
                                : "U"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        {item.is_favourite && (
                          <IconHeartFilled size={14} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="mt-6"
            />
          </>
        ) : (
          <p className="text-zinc-400 text-center py-3">No items found.</p>
        )}
      </div>
    </>
  );
}
