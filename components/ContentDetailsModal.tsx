"use client";

import type React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserContent } from "@/app/dashboard/page";
import {
  IconFile,
  IconBrandTwitter,
  IconBrandYoutube,
  IconLink,
  IconHeart,
  IconShare,
  IconExternalLink,
  IconCalendar,
  IconAlertTriangle,
  IconPencil,
} from "@tabler/icons-react";

interface ContentDetailsModalProps {
  contentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentDetailsModal({
  contentId,
  open,
  onOpenChange,
}: ContentDetailsModalProps) {
  const [content, setContent] = useState<UserContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && contentId) {
      fetchContentDetails(contentId);
    } else {
      setContent(null);
      setIsLoading(false);
      setIsFavorite(false);
      setError(null);
    }
  }, [open, contentId]);

  const fetchContentDetails = async (id: string) => {
    setIsLoading(true);
    setContent(null);
    setError(null);
    try {
      const response = await axios.get<{ data: UserContent }>(
        `/api/get-content/${id}`
      );
      if (response?.data?.data) {
        setContent(response.data.data);
        setIsFavorite(response.data.data.is_favourite || false);
      } else {
        console.error(
          "Error fetching content details: Invalid response structure",
          response
        );
        setError("Failed to retrieve content details due to invalid format.");
        setContent(null);
      }
    } catch (err: any) {
      console.error("Error fetching content details:", err);
      setError(
        `Failed to load content: ${err.message || "An unknown error occurred."}`
      );
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content) return;

    const originalFavoriteState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      await axios.post(`/api/toggle-favorite`, { id: content.id });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(originalFavoriteState);
      alert("Failed to update favorite status. Please try again.");
    }
  };

  const shareContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content) return;

    const shareUrl = content.url;
    const shareTitle = content.title || "Shared Content";
    const shareText = `Check out this content: ${shareTitle}`;

    try {
      if (navigator.share && shareUrl) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else if (shareUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Content link copied to clipboard!");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          content.body || shareTitle || "No content to copy."
        );
        alert("Content text copied to clipboard!");
      } else {
        alert(
          "Sharing/Copying not supported on this browser or no content available."
        );
      }
    } catch (error: any) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing content:", error);
        alert("Could not share the content.");
      }
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (err) {
      console.error("Error formatting date", err);
      return "Invalid Date";
    }
  };

  const getContentTypeIcon = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case "document":
        return <IconFile size={18} stroke={1.5} />;
      case "tweet":
        return <IconBrandTwitter size={18} stroke={1.5} />;
      case "youtube":
        return <IconBrandYoutube size={18} stroke={1.5} />;
      case "link":
        return <IconLink size={18} stroke={1.5} />;
      default:
        return <IconFile size={18} stroke={1.5} />;
    }
  };

  const getContentTypeName = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case "document":
        return "Document";
      case "tweet":
        return "Tweet";
      case "youtube":
        return "YouTube";
      case "link":
        return "Link";
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : "Content";
    }
  };

  // Function to render document body with proper line breaks
  const renderDocumentBody = (body: string | null | undefined) => {
    if (!body) return null;

    return body.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  // --- Render Logic ---

  const renderLoading = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-gray-600 border-t-accent animate-spin rounded-full"></div>
        <p className="text-gray-300 text-lg font-medium">Loading Content...</p>
      </div>
    </div>
  );

  const renderError = () => (
    <>
      <DialogHeader className="p-6 border-b border-gray-700 shrink-0">
        <DialogTitle className="text-xl font-semibold text-red-400 flex items-center gap-2">
          <IconAlertTriangle size={20} stroke={1.5} />
          Error Loading Content
        </DialogTitle>
      </DialogHeader>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-400">
          {error || "Content could not be loaded."}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          The content might not exist, or there was an issue retrieving it.
          Please try again later.
        </p>
      </div>
      <DialogFooter className="p-4 sm:p-6 border-t border-gray-800 bg-[#18181b] shrink-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200"
        >
          Close
        </Button>
      </DialogFooter>
    </>
  );

  const renderContent = () => {
    if (!content) return renderError();

    const hasUrl = !!content.url;
    const isDocument = content.type?.toLowerCase() === "document";

    return (
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <DialogHeader className="p-6 border-b border-gray-700 shrink-0 bg-[#1f1f23]">
          <div className="flex justify-between items-start gap-4">
            <DialogTitle className="text-2xl font-bold mb-2 text-gray-100">
              {content.title || "Untitled Content"}
            </DialogTitle>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
            {/* Content Type Badge */}
            <Badge className="bg-gray-700/60 border-gray-600 text-gray-300 flex items-center gap-1.5 px-3 py-1 rounded-md">
              {getContentTypeIcon(content.type)}
              <span>{getContentTypeName(content.type)}</span>
            </Badge>
            {/* Creation Date */}
            <div
              className="flex items-center gap-1.5"
              title={`Created on ${formatDate(content.created_at)}`}
            >
              <IconCalendar size={16} stroke={1.5} className="text-gray-500" />
              <span>{formatDate(content.created_at)}</span>
            </div>
            {/* Updated Date (only shown if different from creation) */}
            {content.updated_at &&
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
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1c1c1f]">
          {/* Source Link Section (only if URL exists) */}
          {hasUrl && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                Source Link
              </h3>
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#27272A]/70 p-3 rounded-lg border border-gray-700 hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#1c1c1f]"
                title={`Open link: ${content.url}`}
              >
                <IconLink
                  size={18}
                  stroke={1.5}
                  className="text-gray-400 shrink-0"
                />
                <span className="text-accent hover:underline text-sm flex-grow truncate break-all">
                  {content.url}
                </span>
                <IconExternalLink
                  size={16}
                  stroke={1.5}
                  className="text-gray-500 shrink-0"
                />
              </a>
            </div>
          )}

          {/* Content Body/Text Section */}
          {(content.body || (isDocument && content.url)) && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                {isDocument ? "Document Content" : "Text Content"}
              </h3>
              <div className="bg-[#27272A]/70 p-5 rounded-lg border border-gray-700 max-h-[45vh] overflow-y-auto text-gray-300 text-sm leading-relaxed">
                {isDocument ? (
                  <div className="font-serif whitespace-pre-line">
                    {renderDocumentBody(content.body)}
                    {!content.body && content.url && (
                      <p className="text-gray-400 italic">
                        This document is available at the source link above.
                      </p>
                    )}
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {content.body}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Placeholder if no URL and no Body */}
          {!hasUrl && !content.body && (
            <div className="flex items-center justify-center h-full text-center py-10">
              <p className="text-gray-500 italic">
                No content body or source link provided for this item.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex justify-between items-center gap-3 border-t border-gray-700 p-4 sm:p-6 bg-[#1f1f23] shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent"
              onClick={toggleFavorite}
              aria-pressed={isFavorite}
            >
              <IconHeart
                size={16}
                stroke={1.5}
                className={`mr-2 transition-all duration-200 ${
                  isFavorite ? "fill-rose-500 text-rose-500" : "text-gray-400"
                }`}
                aria-hidden="true"
              />
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent"
              onClick={shareContent}
            >
              <IconShare
                size={16}
                stroke={1.5}
                className="mr-2 text-gray-400"
                aria-hidden="true"
              />
              Share
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-300"
          >
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  };

  // Main Return
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1c1c1f] text-white border border-gray-700 shadow-xl sm:max-w-3xl max-h-[90vh] min-h-[50vh] flex flex-col p-0 overflow-hidden rounded-lg">
        {isLoading ? renderLoading() : error ? renderError() : renderContent()}
      </DialogContent>
    </Dialog>
  );
}
