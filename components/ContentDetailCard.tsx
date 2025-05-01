"use client";

import Link from "next/link";
import {
  IconFileText,
  IconBrandTwitter,
  IconBrandYoutube,
  IconLink,
  IconCircleArrowUpRight,
  IconHeartFilled,
  IconUser,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";
import { useState } from "react";
import { ContentDetailsModal } from "./ContentDetailsModal";

type Origin = "Favourites" | "All_Content";

interface ContentCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
  origin: Origin;
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (err) {
    console.error("Error formatting date", err);
    return "Invalid Date";
  }
};

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

export function ContentDetailCard({
  content,
  isLoading,
  username,
  origin,
}: ContentCardProps) {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const contentTypes = [
    { value: "document", label: "Document", icon: IconFileText },
    { value: "tweet", label: "Tweet", icon: IconBrandTwitter },
    { value: "youtube", label: "YouTube", icon: IconBrandYoutube },
    { value: "link", label: "Link", icon: IconLink },
  ];

  const recentItems = [...content].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleCardClick = (contentId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("a")) {
      return;
    }

    setSelectedContentId(contentId);
    setModalOpen(true);
  };

  const getCardBgColor = (type: string) => {
    switch (type) {
      case "youtube":
        return "bg-gradient-to-br from-red-900/30 to-zinc-900";
      case "tweet":
        return "bg-gradient-to-br from-blue-900/30 to-zinc-900";
      case "link":
        return "bg-gradient-to-br from-purple-900/30 to-zinc-900";
      default:
        return "bg-gradient-to-br from-zinc-800 to-zinc-900";
    }
  };

  return (
    <>
      <div className="mt-4 p-4 md:p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          {origin === "Favourites" ? (
            <div className="flex items-center gap-1">
              <IconHeartFilled className="h-5 w-5" />
              <h3 className="text-xl font-semibold text-white">Favourites</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconUser className="h-5 w-5 text-white" />
              <h3 className="text-xl font-semibold text-white">Your Content</h3>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-gray-400 text-center py-4">Loading items...</p>
        ) : recentItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentItems.map((item) => {
              const contentType =
                contentTypes.find((type) => type.value === item.type) ||
                contentTypes[0];
              const IconComponent = contentType.icon;
              const isYouTube = item.type === "youtube";

              return (
                <div
                  key={item.id}
                  className={`${getCardBgColor(
                    item.type
                  )} rounded-xl overflow-hidden shadow-lg border border-zinc-800/50 hover:border-zinc-700/80 transition-all duration-200 ease-in-out cursor-pointer flex flex-col`}
                  onClick={(e) => handleCardClick(item.id, e)}
                >
                  {isYouTube && (
                    <div className="relative w-full h-36 bg-black">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                          <IconPlayerPlay
                            size={24}
                            className="text-white ml-1"
                          />
                        </div>
                      </div>
                      {item.url && (
                        <div className="w-full h-full">
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                              item.url
                            )}?controls=0&showinfo=0`}
                            title={item.title || "YouTube video"}
                            className="w-full h-full object-cover opacity-90"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            isYouTube ? "bg-red-600" : "bg-zinc-700"
                          }`}
                        >
                          <IconComponent size={16} className="text-white" />
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">
                          {contentType.label}
                        </span>
                      </div>

                      {item.type !== "document" && (
                        <Link
                          href={item.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:bg-zinc-700/50 p-1 rounded-full transition-colors"
                        >
                          <IconCircleArrowUpRight
                            size={16}
                            className="text-zinc-400"
                          />
                        </Link>
                      )}
                    </div>

                    <h3 className="text-white font-medium text-sm mt-1 mb-2 line-clamp-2">
                      {item.title || "Untitled"}
                    </h3>

                    {!isYouTube && item.body && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {item.body}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800/70">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-300">
                            {username ? username.charAt(0).toUpperCase() : "U"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                      {item.is_favourite && (
                        <IconHeartFilled size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-400 text-center py-4">No items found.</p>
        )}
      </div>

      <ContentDetailsModal
        contentId={selectedContentId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
