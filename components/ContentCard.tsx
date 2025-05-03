"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconClock,
  IconFileText,
  IconBrandX,
  IconBrandYoutube,
  IconLink,
  IconCircleArrowUpRight,
  IconHeartFilled,
  IconShare,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";
import { useState } from "react";
import { ContentDetailsModal } from "./ContentDetailsModal";
import { formatDate } from "@/lib/format-date";

type Origin = "Recents" | "Profile_Shared";

interface ContentCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
  origin: Origin;
}

export function ContentCard({
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
    { value: "tweet", label: "Tweet", icon: IconBrandX },
    { value: "youtube", label: "YouTube", icon: IconBrandYoutube },
    { value: "link", label: "Link", icon: IconLink },
  ];

  const recentItems = [...content]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const handleCardClick = (contentId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("a")) {
      return;
    }

    setSelectedContentId(contentId);
    setModalOpen(true);
  };

  return (
    <>
      <div className="mt-4 p-4 md:p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          {origin === "Recents" ? (
            <div className="flex items-center gap-1">
              <IconClock className="h-5 w-5" />
              <h3 className="text-xl font-semibold text-white">Recents</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconShare className="h-5 w-5 text-white" />
              <h3 className="text-xl font-semibold text-white">
                Recently Shared
              </h3>
            </div>
          )}

          {content.length > 0 && origin == "Recents" && (
            <Link href="/all-content" passHref>
              <Button
                variant="link"
                className="text-accent hover:text-accent/80 p-0 h-auto cursor-pointer"
              >
                View More
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <p className="text-gray-400 text-center py-4">Loading items...</p>
        ) : recentItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {" "}
            {recentItems.map((item) => {
              const contentType =
                contentTypes.find((type) => type.value === item.type) ||
                contentTypes[0];
              const IconComponent = contentType.icon;

              return (
                <div
                  key={item.id}
                  className="bg-[#27272A] p-4 rounded-2xl border border-transparent hover:border-gray-600/80 transition-all duration-200 ease-in-out cursor-pointer flex flex-col min-h-[150px] shadow-sm relative overflow-hidden"
                  onClick={(e) => handleCardClick(item.id, e)}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-25 blur-md transform translate-x-4 -translate-y-4"></div>
                  <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-gradient-to-br from-white/25 to-transparent opacity-20 blur-sm"></div>

                  <div className="flex justify-between mb-3 relative z-10">
                    <IconComponent size={24} className="text-gray-400" />
                    {item.type !== "document" ? (
                      <Link
                        href={item.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconCircleArrowUpRight
                          size={18}
                          className="text-gray-400 transition-transform duration-200 hover:scale-125"
                        />
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex-grow mb-2 relative z-10">
                    {" "}
                    <p
                      className="text-sm font-medium text-gray-100 line-clamp-3"
                      title={item.title || "Untitled"}
                    >
                      {item.title || "Untitled"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-inner">
                        <span className="text-xs font-medium text-gray-300">
                          {username ? username.charAt(0).toUpperCase() : "U"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                    <div>
                      {item.is_favourite && (
                        <IconHeartFilled size={18} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No items found.</p>
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
