"use client";

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
  IconFileText,
  IconBrandTwitter,
  IconBrandYoutube,
  IconLink,
  IconHeartFilled,
  IconHeart,
  IconShare3,
  IconExternalLink,
  IconCalendar,
  // IconPencil, // If you decide to show updated_at
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

  useEffect(() => {
    if (open && contentId) {
      fetchContentDetails(contentId);
    } else {
      setContent(null);
      setIsLoading(false);
      setIsFavorite(false);
    }
  }, [open, contentId]);

  const fetchContentDetails = async (id: string) => {
    setIsLoading(true);
    setContent(null);
    try {
      const response = await axios.get<{ data: UserContent }>(
        `/api/get-content/${id}`
      );
      if (response && response.data && response.data.data) {
        setContent(response.data.data);
        setIsFavorite(response.data.data.is_favourite);
      } else {
        console.error(
          "Error fetching content details: Invalid response structure",
          response
        );
        setContent(null);
      }
    } catch (error) {
      console.error("Error fetching content details:", error);
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!content) return;
    const originalFavoriteState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      await axios.post(`/api/toggle-favorite`, { id: content.id });
      // API call succeeded
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(originalFavoriteState);
    }
  };

  const shareContent = async () => {
    if (!content) return;

    try {
      if (navigator.share && content.url) {
        await navigator.share({
          title: content.title,
          text: `Check out this content: ${content.title}`,
          url: content.url,
        });
      } else if (content.url) {
        await navigator.clipboard.writeText(content.url);
        alert("Content link copied to clipboard!");
      }
      // else if (content.share_id) {
      //     // Fallback: Copy dedicated share link if no URL but share_id exists
      //     const shareUrl = `${window.location.origin}/shared/${content.share_id}`;
      //     await navigator.clipboard.writeText(shareUrl);
      //     alert('Share link copied to clipboard!');
      // }
      else {
        alert("Sharing not supported or no link available.");
      }

      // Optional: Call your API endpoint if it tracks share actions
      // await axios.post(`/api/share-content`, { id: content.id });
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error sharing content:", error);
      }
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (err) {
      console.error("Error formatting date", err);
      return "Invalid Date";
    }
  };

  const getContentTypeIcon = (type: string | undefined) => {
    switch (type) {
      case "document":
        return <IconFileText className="h-5 w-5" />;
      case "tweet":
        return <IconBrandTwitter className="h-5 w-5" />;
      case "youtube":
        return <IconBrandYoutube className="h-5 w-5" />;
      case "link":
        return <IconLink className="h-5 w-5" />;
      default:
        return <IconFileText className="h-5 w-5" />;
    }
  };

  const getContentTypeName = (type: string | undefined) => {
    switch (type) {
      case "document":
        return "Document";
      case "tweet":
        return "Tweet";
      case "youtube":
        return "YouTube";
      case "link":
        return "Link";
      default:
        return type || "Content";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1c1c1f] text-white border-gray-800 sm:max-w-4xl max-h-[90vh] min-h-[60vh] flex flex-col p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-gray-400 text-lg animate-pulse">
              Loading content...
            </p>
          </div>
        ) : content ? (
          <>
            <DialogHeader className="p-6 border-b border-gray-800 shrink-0">
              <DialogTitle className="text-2xl font-bold mb-3 text-gray-100">
                {content.title || "Untitled Content"}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                <Badge
                  variant="outline"
                  className="bg-gray-700/50 border-gray-600 text-gray-300 flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                >
                  {getContentTypeIcon(content.type)}
                  <span>{getContentTypeName(content.type)}</span>
                </Badge>
                <div className="flex items-center gap-1.5">
                  <IconCalendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(content.created_at)}</span>
                </div>
                {/* Optional: Updated Date - Uncomment if needed
                 {content.created_at !== content.updated_at && (
                   <div className="flex items-center gap-1.5">
                     <IconPencil className="h-4 w-4 text-gray-500" />
                     <span>Updated: {formatDate(content.updated_at)}</span>
                   </div>
                 )} */}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {content.url && (
                <div className="space-y-1.5">
                  <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                    Source Link
                  </h3>
                  <div className="flex items-center gap-2 bg-[#27272A] p-3 rounded-md border border-gray-700">
                    <IconLink className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent/80 text-sm flex-grow truncate break-all"
                      title={content.url}
                    >
                      {content.url}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto text-gray-400 hover:text-gray-200 hover:bg-gray-600/50 shrink-0"
                      onClick={() => window.open(content.url ?? "", "_blank")}
                      aria-label="Open link in new tab"
                    >
                      <IconExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {content.body && (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-200">
                    Content Body
                  </h3>
                  <div className="bg-[#27272A] p-4 rounded-lg border border-gray-700 max-h-[40vh] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                      {content.body}
                    </pre>
                  </div>
                </div>
              )}

              {!content.url && !content.body && (
                <p className="text-gray-500 text-center py-8">
                  No content body or URL provided.
                </p>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-800 p-4 sm:p-6 bg-[#1c1c1f] shrink-0">
              <div className="flex gap-2 w-full sm:w-auto justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 flex-1 sm:flex-none"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                >
                  {isFavorite ? (
                    <IconHeartFilled className="h-4 w-4 text-red-500 mr-2" />
                  ) : (
                    <IconHeart className="h-4 w-4 mr-2 text-gray-400" />
                  )}
                  {isFavorite ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 flex-1 sm:flex-none"
                  onClick={shareContent}
                >
                  <IconShare3 className="h-4 w-4 mr-2 text-gray-400" />
                  Share
                </Button>
              </div>

              {content.url && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
                  onClick={() => window.open(content.url ?? "", "_blank")}
                >
                  <IconExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="p-6 border-b border-gray-800 shrink-0">
              <DialogTitle className="text-xl font-semibold text-red-400">
                Error
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-gray-400">Content could not be loaded.</p>
              <p className="text-sm text-gray-500 mt-1">
                The content might not exist or there was an issue retrieving it.
              </p>
            </div>
            <DialogFooter className="p-4 sm:p-6 border-t border-gray-800 bg-[#1c1c1f] shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
