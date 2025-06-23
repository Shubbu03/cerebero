"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { TexturedBackground } from "@/components/background/TexturedBackground";
import { COLORS } from "@/lib/colors";
import {
  IconAlertTriangle,
  IconCalendar,
  IconExternalLink,
  IconLink,
  IconPencil,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/format-date";
import { getContentTypeIcon, getContentTypeName } from "@/lib/content-funcs";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { UserContent } from "@/app/dashboard/page";
import { useQuery } from "@tanstack/react-query";

const Loading = dynamic(() => import("@/components/ui/loading"), {
  ssr: false,
});

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default function SharedContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    data: content,
    isLoading,
    isError,
  } = useQuery<UserContent | null>({
    queryKey: ["sharedContent", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await axios.get(`/api/share/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: userDetails,
  } = useQuery<{ email: string; name: string } | null>({
    queryKey: ["userDetails", content?.user_id],
    queryFn: async () => {
      if (!content?.user_id) return { email: "", name: "" };
      const user = await axios.get(`/api/get-user/${content.user_id}`);
      if (user.data && user.data.data) {
        return {
          email: user.data.data.email || "",
          name: user.data.data.name || "",
        };
      }
      return { email: "", name: "" };
    },
    enabled: !!content?.user_id,
  });

  const getUserInitials = () => {
    if (!userDetails?.name) return "";
    return userDetails.name
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase();
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-[50vh] w-full p-8">
      <Loading text="Loading Shared Content..." />
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 py-10 bg-[#18181b] rounded-xl shadow-lg border border-gray-800 max-w-2xl mx-auto">
      <IconAlertTriangle size={48} stroke={1.5} className="text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-red-400 mb-2">
        Content Not Found
      </h2>
      <p className="text-gray-400 mb-6">
        This content is not available. It may have been deleted or is not shared
        publicly.
      </p>
    </div>
  );

  const renderContent = () => {
    if (!content || !content.is_shared) return renderError();

    const currentType = content?.type || "";
    const isDocument = currentType.toLowerCase() === "document";
    const hasUrl = Boolean(content?.url);

    return (
      <div className="max-w-full mx-auto px-2 py-2 space-y-2">
        <div className="p-4 space-y-4">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white break-words">
              {content.title || "Untitled Content"}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-800 dark:text-gray-200 font-semibold text-sm">
                  {getUserInitials()}
                </div>
                <p className="text-gray-100">{userDetails?.name}</p>
              </div>

              {(() => {
                const Icon = getContentTypeIcon(content.type);
                if (!Icon) return null;
                return (
                  <Badge className="bg-gray-700/60 border-gray-600 text-gray-300 flex items-center gap-1.5 px-3 py-1.5 rounded-md">
                    <Icon size={16} stroke={1.5} />
                    <span>{getContentTypeName(content.type)}</span>
                  </Badge>
                );
              })()}

              {content.created_at && (
                <div
                  className="flex items-center gap-1.5"
                  title={`Created on ${formatDate(content.created_at)}`}
                >
                  <IconCalendar
                    size={16}
                    stroke={1.5}
                    className="text-gray-500"
                  />
                  <span>{formatDate(content.created_at)}</span>
                </div>
              )}

              {content.updated_at &&
                content.created_at &&
                new Date(content.updated_at) > new Date(content.created_at) && (
                  <div
                    className="flex items-center gap-1.5"
                    title={`Last updated on ${formatDate(content.updated_at)}`}
                  >
                    <IconPencil
                      size={16}
                      stroke={1.5}
                      className="text-gray-500"
                    />
                    <span className="text-xs">
                      Updated: {formatDate(content.updated_at)}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="p-2 md:p-4 space-y-4">
            {hasUrl && !(isDocument && !hasUrl) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider flex items-center gap-2">
                  <IconLink size={16} stroke={1.5} className="text-accent" />
                  Url
                </h3>

                <a
                  href={content.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gradient-to-r from-gray-800/70 to-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-accent transition-colors group"
                  title={`Open link: ${content.url}`}
                >
                  <IconLink
                    size={18}
                    stroke={1.5}
                    className="text-gray-400 group-hover:text-accent transition-colors shrink-0"
                  />
                  <span className="text-accent group-hover:text-accent/80 hover:underline text-sm flex-grow truncate break-all">
                    {content.url}
                  </span>
                  <IconExternalLink
                    size={16}
                    stroke={1.5}
                    className="text-gray-500 group-hover:text-accent transition-colors shrink-0"
                  />
                </a>
              </div>
            )}

            {(content.body || (isDocument && content.url)) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider flex items-center gap-2">
                  <IconPencil size={16} stroke={1.5} className="text-accent" />
                  {isDocument ? "Document Content" : "Text Content"}
                </h3>

                <div className="max-h-screen bg-gradient-to-r from-gray-800/70 to-gray-800/50 p-6 rounded-lg border border-gray-700 overflow-y-auto text-gray-300 text-sm leading-relaxed">
                  <pre className="whitespace-pre-wrap font-mono">
                    {content.body}
                  </pre>
                </div>
              </div>
            )}

            {!hasUrl && !content.body && (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500 italic">
                  No content body or source link provided for this item.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <TexturedBackground className="min-h-screen" dotPattern>
      <div className="text-white">
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
        <ClientOnly>
          {isLoading
            ? renderLoading()
            : isError
            ? renderError()
            : renderContent()}
        </ClientOnly>
      </div>
    </TexturedBackground>
  );
}
