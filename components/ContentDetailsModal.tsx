"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  IconDeviceFloppy,
  IconX,
} from "@tabler/icons-react";

interface ContentDetailsModalProps {
  contentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContentUpdate?: () => void;
}

const CONTENT_TYPES = ["document", "tweet", "youtube", "link"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Content type is required"),
  url: z.string().optional(),
  body: z.string().optional(),
});

export function ContentDetailsModal({
  contentId,
  open,
  onOpenChange,
  onContentUpdate,
}: ContentDetailsModalProps) {
  const [content, setContent] = useState<UserContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "",
      url: "",
      body: "",
    },
  });

  const resetEditState = useCallback(() => {
    setIsEditing(false);
    setIsSaving(false);
    if (content) {
      form.reset({
        title: content.title || "",
        type: content.type || "",
        url: content.url || "",
        body: content.body || "",
      });
    } else {
      form.reset({
        title: "",
        type: "",
        url: "",
        body: "",
      });
    }
  }, [content, form]);

  useEffect(() => {
    if (open && contentId) {
      fetchContentDetails(contentId);
    } else {
      setContent(null);
      setIsLoading(false);
      setIsFavorite(false);
      setError(null);
      resetEditState();
    }
  }, [open, contentId]);

  useEffect(() => {
    if (content) {
      resetEditState();
    }
  }, [content, resetEditState]);

  const fetchContentDetails = async (id: string) => {
    setIsLoading(true);
    setContent(null);
    setError(null);
    resetEditState();
    try {
      const response = await axios.get<{ data: UserContent }>(
        `/api/get-content/${id}`
      );
      if (response?.data?.data) {
        setContent(response.data.data);
        setIsFavorite(response.data.data.is_favourite || false);
        form.reset({
          title: response.data.data.title || "",
          type: response.data.data.type || "",
          url: response.data.data.url || "",
          body: response.data.data.body || "",
        });
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
    if (!content || isEditing) return;

    const originalFavoriteState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      await axios.post(`/api/toggle-favorite`, { id: content.id });
      setContent((prev) =>
        prev ? { ...prev, is_favourite: !originalFavoriteState } : null
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(originalFavoriteState);
      alert("Failed to update favorite status. Please try again.");
    }
  };

  const shareContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content || isEditing) return;

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
      } else if (content.body && navigator.clipboard) {
        await navigator.clipboard.writeText(content.body);
        alert("Content text copied to clipboard!");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareTitle);
        alert("Content title copied to clipboard!");
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

  const handleEditClick = () => {
    if (!content) return;
    setIsEditing(true);
    form.reset({
      title: content.title || "",
      type: content.type || "",
      url: content.url || "",
      body: content.body || "",
    });
  };

  const handleCancelEdit = () => {
    resetEditState();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!content || !contentId) return;
    setIsSaving(true);
    setError(null);

    try {
      const updatedData = {
        title: values.title,
        type: values.type,
        url: values.url,
        body: values.type === "document" ? values.body : content.body,
      };

      const response = await axios.patch(
        `/api/update-content/${contentId}`,
        updatedData
      );

      if (response?.data?.data) {
        setContent(response.data.data);
        setIsEditing(false);
        onContentUpdate?.();
      } else {
        console.error("Update failed: Invalid response structure", response);
        setError("Failed to save changes: Invalid server response.");
      }
    } catch (err: any) {
      console.error("Error saving content:", err);
      setError(
        `Failed to save: ${
          err?.response?.data?.error ||
          err.message ||
          "An unknown error occurred."
        }`
      );
    } finally {
      setIsSaving(false);
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

  const renderDocumentBody = (body: string | null | undefined) => {
    if (!body) return null;
    return body.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-full w-full p-8">
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
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-400">
          {error || "Content could not be loaded."}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Please try again later or contact support if the problem persists.
        </p>
        {isSaving && error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
      <DialogFooter className="p-4 sm:p-6 border-t border-gray-800 bg-[#18181b] shrink-0 flex justify-end">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200"
        >
          Close
        </Button>
      </DialogFooter>
    </>
  );

  const renderContent = () => {
    if (!content) return renderError();

    const currentType = form.watch("type") || content.type;
    const isDocument = currentType?.toLowerCase() === "document";
    const hasUrl = !!content.url;

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="p-6 border-b border-gray-700 shrink-0 bg-[#1f1f23]">
            <div className="flex justify-between items-center gap-4">
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter Title"
                          className="text-2xl font-bold text-gray-100 bg-gray-800 border-gray-600 focus:border-accent focus:ring-accent"
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
              ) : (
                <DialogTitle className="text-2xl font-bold text-gray-100 flex-grow min-w-0 break-words flex items-center gap-2">
                  {content.title || "Untitled Content"}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditClick}
                    className="text-gray-400 hover:text-gray-100 hover:bg-gray-700 shrink-0 h-6 w-6"
                    aria-label="Edit content details"
                    title="Edit content details"
                  >
                    <IconPencil size={16} stroke={1.5} />
                  </Button>
                </DialogTitle>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 mt-2">
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="w-[180px]">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSaving}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-300 focus:border-accent focus:ring-accent">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-600 text-gray-200">
                          {CONTENT_TYPES.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="capitalize hover:bg-gray-700 focus:bg-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                {getContentTypeIcon(type)}
                                {getContentTypeName(type)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
              ) : (
                <Badge className="bg-gray-700/60 border-gray-600 text-gray-300 flex items-center gap-1.5 px-3 py-1 rounded-md">
                  {getContentTypeIcon(content.type)}
                  <span>{getContentTypeName(content.type)}</span>
                </Badge>
              )}

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
            {isEditing && error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </DialogHeader>

          <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-[#1c1c1f]">
            {(hasUrl || isEditing) &&
              !(isDocument && !hasUrl && !isEditing) && (
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                    Source Link
                  </h3>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              type="url"
                              placeholder="Enter URL (optional)"
                              className="text-sm text-gray-100 bg-gray-800 border-gray-600 focus:border-accent focus:ring-accent w-full"
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-sm" />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <a
                      href={content.url || "#"}
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
                  )}
                </div>
              )}

            {(content.body || (isDocument && (content.url || isEditing))) && (
              <div className="space-y-2">
                <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                  {isDocument ? "Document Content" : "Text Content"}
                </h3>
                {isEditing && isDocument ? (
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter document content"
                            className="min-h-[200px] text-sm text-gray-100 bg-gray-800 border-gray-600 focus:border-accent focus:ring-accent w-full font-serif"
                            disabled={isSaving}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-sm" />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="bg-[#27272A]/70 p-5 rounded-lg border border-gray-700 overflow-y-auto text-gray-300 text-sm leading-relaxed">
                    {isDocument ? (
                      <div className="font-serif whitespace-pre-line">
                        {renderDocumentBody(content.body)}
                        {!content.body && content.url && !isEditing && (
                          <p className="text-gray-400 italic">
                            This document is available at the source link above.
                          </p>
                        )}
                        {isEditing && !form.watch("url") && !content.body && (
                          <p className="text-gray-400 italic">
                            Enter a Source Link or save with body content.
                          </p>
                        )}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {content.body}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {!hasUrl && !content.body && !isEditing && (
              <div className="flex items-center justify-center py-6">
                <p className="text-gray-500 italic">
                  No content body or source link provided for this item.
                </p>
              </div>
            )}
            {isEditing &&
              !form.watch("url") &&
              !content.body &&
              !(isDocument && content.body) && (
                <div className="flex items-center justify-center py-6">
                  <p className="text-gray-500 italic">
                    Enter a Title and either a Source Link or ensure body
                    content exists.
                  </p>
                </div>
              )}
          </div>

          <DialogFooter className="border-t border-gray-700 p-4 bg-[#1f1f23] shrink-0">
            <div className="flex justify-end items-center gap-3 w-full">
              {isEditing ? (
                <>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-black focus:ring-accent"
                    disabled={isSaving || !form.formState.isValid}
                  >
                    <IconDeviceFloppy size={16} stroke={1.5} className="mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <IconX size={16} stroke={1.5} className="mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
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
                        isFavorite
                          ? "fill-rose-500 text-rose-500"
                          : "text-gray-400"
                      }`}
                      aria-hidden="true"
                    />
                    {isFavorite ? "Favorited" : "Favorite"}
                  </Button>
                  <Button
                    type="button"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && isEditing) {
          onOpenChange(false);
        } else {
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="bg-[#1c1c1f] text-white border border-gray-700 shadow-xl sm:max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-lg">
        {isLoading
          ? renderLoading()
          : content
          ? renderContent()
          : renderError()}
      </DialogContent>
    </Dialog>
  );
}
