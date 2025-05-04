"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { type UserContent } from "@/app/dashboard/page";
import {
  IconLink,
  IconHeart,
  IconShare,
  IconExternalLink,
  IconCalendar,
  IconAlertTriangle,
  IconPencil,
  IconDeviceFloppy,
  IconX,
  IconPlus,
  IconTag,
  IconArrowLeft,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/format-date";
import { getContentTypeIcon, getContentTypeName } from "@/lib/content-funcs";
import Loading from "@/components/ui/loading";

interface Tag {
  id: string;
  name: string;
}

const CONTENT_TYPES = ["document", "tweet", "youtube", "link"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Content type is required"),
  url: z.string().optional(),
  body: z.string().optional(),
});

export default function ContentDetail() {
  const params = useParams();
  const router = useRouter();
  const contentId = params?.id as string;

  const [content, setContent] = useState<UserContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

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
    if (contentId) {
      fetchContentDetails(contentId);
      fetchContentTags(contentId);
    }
  }, [contentId]);

  useEffect(() => {
    if (content) {
      resetEditState();
    }
  }, [content, resetEditState]);

  const fetchContentDetails = async (id: string) => {
    setIsLoading(true);
    setContent(null);
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
        setContent(null);
      }
    } catch (err: unknown) {
      console.error("Error fetching content details:", err);
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentTags = async (id: string) => {
    setIsLoadingTags(true);
    try {
      const response = await axios.get<{ data: Tag[] }>(
        `/api/get-content-tags?contentID=${id}`
      );
      if (response?.data?.data) {
        setTags(response.data.data);
      } else {
        console.error(
          "Error fetching content tags: Invalid response structure",
          response
        );
        setTags([]);
      }
    } catch (err: unknown) {
      console.error("Error fetching content tags:", err);
      setTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const addTag = async () => {
    const name = newTagValue.trim();
    if (!name || isAddingTag) return;

    console.log("TAG TO ADD IS::", name);
    setIsAddingTag(true);
    try {
      const { data } = await axios.post("/api/tags", { name });
      if (data?.data) {
        setTags((prev) => [...prev, data.data]);
        setNewTagValue("");
      } else {
        console.error("Add tag failed: invalid response", data);
      }
    } catch (err) {
      console.error("Error adding tag:", err);
    } finally {
      setIsAddingTag(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    if (isEditing) return;

    try {
      await axios.delete(`/api/tags/${tagId}`);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      console.error("Error deleting tag:", err);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content || isEditing) return;

    const originalFavoriteState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      await axios.put(`/api/toggle-favourite/${content.id}`);
      setContent((prev) =>
        prev ? { ...prev, is_favourite: !originalFavoriteState } : null
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite(originalFavoriteState);
    }
  };

  const shareContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content || isEditing) return;

    try {
      const response = await axios.patch(`/api/share?id=${content.id}`);
      if (response?.data?.share_url) {
        setShareableLink(response.data.share_url);
      } else {
        console.error("Share failed: Invalid response structure", response);
        alert("Failed to generate shareable link. Please try again.");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing content:", error);
        alert("Failed to share content. Please try again.");
      }
    } finally {
      if (shareableLink) {
        setIsShareModalOpen(true);
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
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

    try {
      const updatedData = {
        title: values.title,
        type: values.type,
        url: values.type === "document" ? null : values.url,
        body: values.type === "document" ? values.body : content.body,
      };

      const response = await axios.put(
        `/api/edit-content/${contentId}`,
        updatedData
      );

      if (response?.data) {
        setContent(response.data.content);
        setIsEditing(false);
      } else {
        console.error("Update failed: Invalid response structure");
      }
    } catch (err: unknown) {
      console.error("Error saving content:", err);
    } finally {
      setIsSaving(false);
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

  const goBack = () => {
    router.back();
  };

  const renderLoading = () => (
    <div className="flex items-center justify-center h-[50vh] w-full p-8">
      <Loading text="Loading Content..." />
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 py-10 bg-[#18181b] rounded-xl shadow-lg border border-gray-800 max-w-2xl mx-auto">
      <IconAlertTriangle size={48} stroke={1.5} className="text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-red-400 mb-2">
        Content Not Found
      </h2>
      <p className="text-gray-400 mb-6">
        We couldn&apos;t find the content you&apos;re looking for. It may have
        been deleted or is unavailable.
      </p>
      <Button
        variant="outline"
        onClick={goBack}
        className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200"
      >
        <IconArrowLeft size={16} className="mr-2" /> Go Back
      </Button>
    </div>
  );

  const renderTagsSection = () => {
    if (isLoadingTags) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <IconTag size={16} stroke={1.5} className="text-gray-500" />
          <span>Loading tags...</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 tracking-wider flex items-center gap-2">
          <IconTag size={14} stroke={1.5} />
          Tags
        </h3>

        <div className="flex flex-wrap gap-2 items-center">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge
                key={tag.id}
                className="bg-gray-700/60 border-gray-600 text-gray-300 px-3 py-1 rounded-md flex items-center gap-1.5"
              >
                <span>{tag.name}</span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => deleteTag(tag.id)}
                    title="Remove tag"
                    className="ml-1 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <IconX size={14} stroke={1.5} />
                  </button>
                )}
              </Badge>
            ))
          ) : (
            <span className="text-gray-500 text-sm italic">No tags added</span>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                placeholder="Add tag..."
                className="w-24 h-8 text-xs bg-gray-800 border-gray-600 text-gray-200 focus:border-accent focus:ring-accent"
                disabled={isAddingTag}
              />
              <Button
                type="submit"
                onClick={addTag}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-2 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 cursor-pointer"
                disabled={!newTagValue.trim() || isAddingTag}
              >
                <IconPlus size={16} stroke={1.5} />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!content) return renderError();

    const currentType = form.watch("type") || content.type;
    const isDocument = currentType?.toLowerCase() === "document";
    const hasUrl = !!content.url;

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="max-w-full mx-auto px-2 py-2 space-y-2">
            <Button
              variant="ghost"
              onClick={goBack}
              className="mb-2 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <IconArrowLeft size={16} className="mr-2" /> Back
            </Button>

            <div className="p-4 space-y-2">
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter Title"
                          className="text-3xl font-bold text-gray-100 bg-gray-800/50 border-gray-600 focus:border-accent focus:ring-accent"
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="flex items-center justify-start">
                  <h1 className="text-3xl md:text-4xl font-bold text-white break-words">
                    {content.title || "Untitled Content"}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditClick}
                    className="text-gray-400 hover:text-white hover:cursor-pointer h-10 w-10 rounded-full"
                    aria-label="Edit content details"
                    title="Edit content details"
                  >
                    <IconPencil size={20} stroke={1.5} className="ml-3" />
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400 mt-4">
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
                            <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-300 focus:border-accent focus:ring-accent">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-600 text-gray-200">
                            {CONTENT_TYPES.map((type) => {
                              const Icon = getContentTypeIcon(type);
                              return (
                                <SelectItem
                                  key={type}
                                  value={type}
                                  className="capitalize hover:bg-gray-700 focus:bg-gray-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon size={18} stroke={1.5} />
                                    {getContentTypeName(type)}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400 text-sm" />
                      </FormItem>
                    )}
                  />
                ) : (
                  (() => {
                    const Icon = getContentTypeIcon(content.type);
                    return (
                      <Badge className="bg-gray-700/60 border-gray-600 text-gray-300 flex items-center gap-1.5 px-3 py-1.5 rounded-md">
                        <Icon size={16} stroke={1.5} />
                        <span>{getContentTypeName(content.type)}</span>
                      </Badge>
                    );
                  })()
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
                  new Date(content.updated_at) >
                    new Date(content.created_at) && (
                    <div
                      className="flex items-center gap-1.5"
                      title={`Last updated on ${formatDate(
                        content.updated_at
                      )}`}
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

              <div className="mt-4 pt-4">{renderTagsSection()}</div>
            </div>

            <div className="overflow-hidden">
              <div className="p-2 md:p-4 space-y-4">
                {(hasUrl || isEditing) &&
                  !(isDocument && !hasUrl && !isEditing) && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-300 tracking-wider flex items-center gap-2">
                        <IconLink
                          size={16}
                          stroke={1.5}
                          className="text-accent"
                        />
                        Url
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
                                  className="text-sm text-gray-100 bg-gray-800/50 border-gray-600 focus:border-accent focus:ring-accent w-full"
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
                      )}
                    </div>
                  )}

                {(content.body ||
                  (isDocument && (content.url || isEditing))) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-300 tracking-wider flex items-center gap-2">
                      {isDocument ? (
                        <>
                          <IconPencil
                            size={16}
                            stroke={1.5}
                            className="text-accent"
                          />
                          Document Content
                        </>
                      ) : (
                        <>
                          <IconPencil
                            size={16}
                            stroke={1.5}
                            className="text-accent"
                          />
                          Text Content
                        </>
                      )}
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
                                className="text-sm text-gray-100 bg-gray-800/50 border-gray-600 focus:border-accent focus:ring-accent w-full font-serif"
                                disabled={isSaving}
                              />
                            </FormControl>
                            <FormMessage className="text-red-400 text-sm" />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="max-h-screen bg-gradient-to-r from-gray-800/70 to-gray-800/50 p-6 rounded-lg border border-gray-700 overflow-y-auto text-gray-300 text-sm leading-relaxed">
                        {isDocument ? (
                          <div className="font-mono whitespace-pre-line">
                            {renderDocumentBody(content.body)}
                            {!content.body && content.url && !isEditing && (
                              <p className="text-gray-400 italic">
                                This document is available at the source link
                                above.
                              </p>
                            )}
                            {isEditing &&
                              !form.watch("url") &&
                              !content.body && (
                                <p className="text-gray-400 italic">
                                  Enter a Source Link or save with body content.
                                </p>
                              )}
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono">
                            {content.body}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!hasUrl && !content.body && !isEditing && (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500 italic">
                      No content body or source link provided for this item.
                    </p>
                  </div>
                )}
                {isEditing &&
                  !form.watch("url") &&
                  !content.body &&
                  !(isDocument && content.body) && (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-500 italic">
                        Enter a Title and either a Source Link or ensure body
                        content exists.
                      </p>
                    </div>
                  )}
              </div>

              <div className="p-6  flex items-center justify-end gap-3">
                {isEditing ? (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      className="bg-accent hover:bg-accent/90 text-white focus:ring-accent cursor-pointer rounded-xl"
                      disabled={isSaving || !form.formState.isValid}
                    >
                      <IconDeviceFloppy
                        size={18}
                        stroke={1.5}
                        className="mr-2"
                      />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent cursor-pointer rounded-xl"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <IconX size={18} stroke={1.5} className="mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent cursor-pointer"
                      onClick={toggleFavorite}
                      aria-pressed={isFavorite}
                    >
                      <IconHeart
                        size={18}
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
                      className="bg-transparent border-gray-600 hover:bg-gray-700/50 hover:border-gray-500 text-gray-300 focus:ring-accent cursor-pointer"
                      onClick={shareContent}
                    >
                      <IconShare
                        size={18}
                        stroke={1.5}
                        className="mr-2 text-gray-400"
                        aria-hidden="true"
                      />
                      Share
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    );
  };

  const renderShareModal = () => (
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
      <DialogContent className="bg-[#1c1c1f] text-white border border-gray-700 shadow-xl sm:max-w-md w-[95vw] p-0 overflow-hidden rounded-lg">
        <DialogHeader className="p-6 border-b border-gray-700 shrink-0 bg-[#1f1f23]">
          <DialogTitle className="text-xl font-semibold text-gray-100">
            Share Content
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Share this link with others to give them access to this content:
          </p>
          <div className="flex gap-2">
            <Input
              value={shareableLink}
              readOnly
              className="bg-gray-800 border-gray-600 text-gray-100"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className={`shrink-0 bg-gray-700 cursor-pointer ${
                isCopied ? "text-white" : "text-gray-200"
              }`}
            >
              {isCopied ? (
                <IconCheck size={18} stroke={1.5} className="mr-2" />
              ) : (
                <IconCopy size={18} stroke={1.5} className="mr-2" />
              )}
              {isCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        <DialogFooter className="border-t border-gray-700 p-4 bg-[#1f1f23]">
          <Button
            onClick={() => setIsShareModalOpen(false)}
            variant="ghost"
            className="text-gray-400 hover:text-gray-300 cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen text-white pb-16">
      {isLoading ? renderLoading() : renderContent()}
      {renderShareModal()}
    </div>
  );
}
