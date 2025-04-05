"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconClock,
  IconFileText,
  IconBrandTwitter,
  IconBrandYoutube,
  IconLink,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";

interface RecentsCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
}

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (err) {
    console.error("Error formating date", err);
    return "Invalid Date";
  }
};

export function RecentsCard({
  content,
  isLoading,
  username,
}: RecentsCardProps) {
  const contentTypes = [
    { value: "document", label: "Document", icon: IconFileText },
    { value: "tweet", label: "Tweet", icon: IconBrandTwitter },
    { value: "youtube", label: "YouTube", icon: IconBrandYoutube },
    { value: "link", label: "Link", icon: IconLink },
  ];

  const recentItems = [...content]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <div className="mt-8 p-4 md:p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1">
          <IconClock className="h-5 w-5" />
          <h3 className="text-xl font-semibold text-white">Recents</h3>
        </div>
        {content.length > 0 && (
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
        <p className="text-gray-400 text-center py-4">
          Loading recent items...
        </p>
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
                className="bg-[#27272A] p-4 rounded-2xl border border-transparent hover:border-gray-600/80 transition-all duration-200 ease-in-out cursor-pointer flex flex-col min-h-[150px] shadow-sm"
              >
                <div className="mb-3">
                  {" "}
                  <IconComponent size={24} className="text-gray-400" />
                </div>

                <div className="flex-grow mb-2">
                  {" "}
                  <p
                    className="text-sm font-medium text-gray-100 line-clamp-3"
                    title={item.title || "Untitled"}
                  >
                    {item.title || "Untitled"}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-1">
                  {" "}
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-inner">
                    <span className="text-xs font-medium text-gray-300">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-4">No recent items found.</p>
      )}
    </div>
  );
}
