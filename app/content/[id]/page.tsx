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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type UserContent } from "@/app/dashboard/page";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconHeart,
  IconLink,
  IconPencil,
  IconPlus,
  IconShare,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { formatDate } from "@/lib/format-date";
import { getContentTypeIcon, getContentTypeName } from "@/lib/content-funcs";
import Loading from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { notify } from "@/lib/notify";
import { CONTENT_TYPE_ACCENTS } from "@/lib/design/tokens";
import { PageContainer, PageShell } from "@/components/layout/PageShell";

export interface Tag {
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
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const session = useSession();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "",
      url: "",
      body: "",
    },
    mode: "onChange",
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
      return;
    }

    form.reset({
      title: "",
      type: "",
      url: "",
      body: "",
    });
  }, [content, form]);

  const fetchContentDetails = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setContent(null);
      resetEditState();

      try {
        const response = await axios.get<{ data: UserContent }>(
          `/api/get-content/${id}`
        );
        const contentData = response?.data?.data;

        if (!contentData) {
          console.error(
            "Error fetching content details: Invalid response structure",
            response
          );
          setContent(null);
          return;
        }

        setContent(contentData);
        setIsFavorite(contentData.is_favourite || false);
        form.reset({
          title: contentData.title || "",
          type: contentData.type || "",
          url: contentData.url || "",
          body: contentData.body || "",
        });
      } catch (err: unknown) {
        console.error("Error fetching content details:", err);
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    },
    [form, resetEditState]
  );

  const fetchContentTags = useCallback(async (id: string) => {
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
  }, []);

  useEffect(() => {
    if (!contentId) return;
    fetchContentDetails(contentId);
    fetchContentTags(contentId);
  }, [contentId, fetchContentDetails, fetchContentTags]);

  useEffect(() => {
    if (content) {
      resetEditState();
    }
  }, [content, resetEditState]);

  const fetchTagSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get<Tag[]>("/api/tags");
      const source = Array.isArray(response.data) ? response.data : [];
      const filteredSuggestions = source.filter(
        (suggestion) =>
          !tags.some((tag) => tag.id === suggestion.id) &&
          suggestion.name.trim() !== ""
      );
      setSuggestedTags(filteredSuggestions);
    } catch (error) {
      console.error("Error fetching tag suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [tags]);

  const handleInputFocus = () => {
    setInputFocused(true);
    void fetchTagSuggestions();
  };

  const attachExistingTag = async (tag: Tag) => {
    if (isAddingTag || isEditing) return;

    setIsAddingTag(true);
    try {
      await axios.post("/api/edit-content-tags", {
        contentID: contentId,
        tagID: tag.id,
      });
      setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
      setNewTagValue("");
      setInputFocused(false);
      notify("Tag added", "success");
    } catch (err) {
      console.error("Error adding existing tag:", err);
      notify("Error adding tag", "error");
    } finally {
      setIsAddingTag(false);
    }
  };

  const addTag = async () => {
    const name = newTagValue.trim();
    if (!name || isAddingTag || isEditing) return;

    const existingSuggestion = suggestedTags.find(
      (suggestion) => suggestion.name.toLowerCase() === name.toLowerCase()
    );
    if (existingSuggestion) {
      await attachExistingTag(existingSuggestion);
      return;
    }

    setIsAddingTag(true);
    try {
      const response = await axios.post<Tag>("/api/tags", { name });
      if (response?.data) {
        const createdTag = response.data;
        await axios.post("/api/edit-content-tags", {
          contentID: contentId,
          tagID: createdTag.id,
        });
        setTags((prev) => [...prev, createdTag]);
        setNewTagValue("");
        notify("Tag created", "success");
      } else {
        console.error("Add tag failed");
        notify("Error adding tag", "error");
      }
    } catch (err) {
      console.error("Error adding tag:", err);
      notify("Error adding tag", "error");
    } finally {
      setIsAddingTag(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    if (isEditing) return;

    try {
      await axios.delete("/api/edit-content-tags", {
        data: {
          contentID: contentId,
          tagID: tagId,
        },
      });
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      notify("Tag removed", "success");
    } catch (err) {
      console.error("Error deleting tag:", err);
      notify("Error removing tag", "error");
    } finally {
      void fetchTagSuggestions();
    }
  };

  const toggleFavorite = async () => {
    if (!content || isEditing) return;

    const originalFavoriteState = isFavorite;
    setIsFavorite(!originalFavoriteState);

    try {
      await axios.put(`/api/toggle-favourite/${content.id}`);
      setContent((prev) =>
        prev ? { ...prev, is_favourite: !originalFavoriteState } : null
      );
      await queryClient.invalidateQueries({
        queryKey: ["favourites", session.data?.user?.id],
      });
      notify("Favourite status updated", "success");
    } catch (error) {
      setIsFavorite(originalFavoriteState);
      notify("Error toggling favourite", "error");
      throw error;
    }
  };

  const shareContent = async () => {
    if (!content || isEditing) return;

    setIsShareModalOpen(true);
    try {
      const response = await axios.get(`/api/share?id=${content.id}`);
      const { is_shared, share_url } = response.data;
      setIsShared(Boolean(is_shared));
      setShareableLink(share_url || "");
    } catch (error) {
      console.error("Error fetching share info:", error);
      notify("Failed to fetch sharing info", "error");
    }
  };

  const handleToggleShare = async () => {
    if (!content) return;

    try {
      const response = await axios.patch(`/api/share?id=${content.id}`);
      if (response.status !== 200) {
        notify("Failed to update sharing status", "error");
        return;
      }

      const getResponse = await axios.get(`/api/share?id=${content.id}`);
      const { is_shared, share_url } = getResponse.data;
      setIsShared(Boolean(is_shared));
      setShareableLink(share_url || "");
      notify(
        is_shared ? "Public sharing enabled" : "Public sharing disabled",
        "success"
      );
    } catch (error) {
      console.error("Error toggling share:", error);
      notify("Failed to update sharing status", "error");
    }
  };

  const copyToClipboard = async () => {
    if (!shareableLink) return;

    try {
      await navigator.clipboard.writeText(shareableLink);
      setIsCopied(true);
      notify("Share link copied", "success");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      notify("Could not copy share link", "error");
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

      if (response?.data?.content) {
        setContent(response.data.content);
        setIsEditing(false);
        notify("Content updated", "success");
      } else {
        console.error("Update failed: Invalid response structure");
        notify("Failed to save content", "error");
      }
    } catch (err: unknown) {
      console.error("Error saving content:", err);
      notify("Error saving content", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  const renderLoading = () => (
    <div className="surface-soft flex min-h-[46vh] items-center justify-center rounded-2xl px-4 py-10">
      <Loading text="Loading content..." />
    </div>
  );

  const renderError = () => (
    <div className="surface-soft mx-auto flex min-h-[46vh] max-w-2xl flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
      <IconAlertTriangle size={46} stroke={1.5} className="mb-4 text-destructive" />
      <h2 className="text-fluid-xl font-semibold tracking-tight text-foreground">
        Content Not Found
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This item may have been deleted, or you may no longer have access to it.
      </p>
      <Button variant="outline" onClick={goBack} className="mt-6">
        <IconArrowLeft size={15} />
        Go Back
      </Button>
    </div>
  );

  const renderTagsSection = () => {
    if (isLoadingTags) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconTag size={15} stroke={1.5} />
          <span>Loading tags...</span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <IconTag size={14} stroke={1.5} />
          Tags
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="gap-1 border border-border/80 bg-surface-2 px-2.5 py-1 text-foreground"
              >
                <span>{tag.name}</span>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => deleteTag(tag.id)}
                    title="Remove tag"
                    aria-label={`Remove tag ${tag.name}`}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <IconX size={12} stroke={1.8} />
                  </button>
                ) : null}
              </Badge>
            ))
          ) : (
            <p className="text-sm italic text-muted-foreground">No tags added yet.</p>
          )}
        </div>

        {!isEditing ? (
          <div className="relative flex w-full max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={newTagValue}
                onChange={(event) => setNewTagValue(event.target.value)}
                onFocus={handleInputFocus}
                onBlur={() => {
                  setTimeout(() => setInputFocused(false), 180);
                }}
                placeholder="Add tag..."
                className="h-10"
                disabled={isAddingTag}
              />

              {inputFocused ? (
                <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                  {isLoadingSuggestions ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Loading suggestions...
                    </div>
                  ) : suggestedTags.length > 0 ? (
                    <div className="max-h-52 overflow-y-auto py-1">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => attachExistingTag(tag)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent"
                        >
                          <span className="truncate">{tag.name}</span>
                          <IconPlus size={13} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No suggestions
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={addTag}
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
              disabled={!newTagValue.trim() || isAddingTag}
              aria-label="Add tag"
            >
              <IconPlus size={16} stroke={1.6} />
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderContent = () => {
    if (!content) return renderError();

    const currentType = form.watch("type") || content.type;
    const isDocument = currentType?.toLowerCase() === "document";
    const hasUrl = Boolean(content.url);
    const TypeIcon = getContentTypeIcon(content.type);
    const contentTypeAccent =
      CONTENT_TYPE_ACCENTS[content.type] || CONTENT_TYPE_ACCENTS.document;

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="h-9 px-2 text-muted-foreground"
            >
              <IconArrowLeft size={15} />
              Back
            </Button>

            {!isEditing ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                >
                  <IconHeart
                    size={16}
                    stroke={1.5}
                    className={
                      isFavorite
                        ? "fill-rose-500 text-rose-500"
                        : "text-muted-foreground"
                    }
                  />
                  {isFavorite ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={shareContent}
                >
                  <IconShare size={16} stroke={1.5} />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleEditClick}
                >
                  <IconPencil size={16} stroke={1.5} />
                  Edit
                </Button>
              </div>
            ) : null}
          </div>

          <section className="surface-soft rounded-2xl p-4 sm:p-6">
            <div className="space-y-5">
              {isEditing ? (
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter title"
                          className="h-12 text-lg font-semibold sm:text-xl"
                          disabled={isSaving}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <h1 className="text-fluid-2xl font-semibold tracking-tight text-foreground break-words">
                  {content.title || "Untitled Content"}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="w-[190px]">
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSaving}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full bg-card">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTENT_TYPES.map((type) => {
                              const Icon = getContentTypeIcon(type);
                              return (
                                <SelectItem key={type} value={type}>
                                  <div className="flex items-center gap-2">
                                    <Icon size={14} stroke={1.6} />
                                    {getContentTypeName(type)}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <Badge className={`gap-1.5 ${contentTypeAccent}`}>
                    <TypeIcon size={13} />
                    {getContentTypeName(content.type)}
                  </Badge>
                )}

                <div
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs sm:text-sm"
                  title={`Created on ${formatDate(content.created_at)}`}
                >
                  <IconCalendar size={14} stroke={1.5} />
                  <span>{formatDate(content.created_at)}</span>
                </div>

                {content.updated_at &&
                new Date(content.updated_at) > new Date(content.created_at) ? (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs sm:text-sm"
                    title={`Updated on ${formatDate(content.updated_at)}`}
                  >
                    <IconPencil size={14} stroke={1.5} />
                    <span>Updated {formatDate(content.updated_at)}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/75 bg-card/40 p-4">
                {renderTagsSection()}
              </div>
            </div>
          </section>

          <section className="surface-soft rounded-2xl p-4 sm:p-6">
            <div className="space-y-5">
              {(hasUrl || isEditing) && !(isDocument && !hasUrl && !isEditing) ? (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <IconLink size={14} stroke={1.5} />
                    Source URL
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
                              placeholder="https://example.com"
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <a
                      href={content.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-border bg-surface-2/75 p-3.5 transition hover:border-border/90 hover:bg-accent/70"
                      title={`Open link: ${content.url}`}
                    >
                      <IconLink
                        size={16}
                        stroke={1.5}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="truncate text-sm text-foreground">
                        {content.url}
                      </span>
                      <IconExternalLink
                        size={14}
                        stroke={1.5}
                        className="ml-auto shrink-0 text-muted-foreground transition group-hover:text-foreground"
                      />
                    </a>
                  )}
                </div>
              ) : null}

              {content.body || (isDocument && (content.url || isEditing)) ? (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <IconPencil size={14} stroke={1.5} />
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
                              className="min-h-[220px] font-mono"
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="max-h-[58vh] overflow-y-auto rounded-xl border border-border bg-surface-2/70 p-4 text-sm leading-relaxed text-foreground sm:p-5">
                      {isDocument ? (
                        <div className="whitespace-pre-line font-mono">
                          {content.body}
                          {!content.body && content.url && !isEditing ? (
                            <p className="italic text-muted-foreground">
                              This document is available at the source link above.
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {content.body}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {!hasUrl && !content.body && !isEditing ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-10">
                  <p className="text-sm italic text-muted-foreground">
                    No content body or source URL has been provided for this item.
                  </p>
                </div>
              ) : null}

              {isEditing &&
              !form.watch("url") &&
              !content.body &&
              !(isDocument && content.body) ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-10">
                  <p className="text-sm italic text-muted-foreground">
                    Add a source URL, or provide document content before saving.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {isEditing ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <IconX size={16} stroke={1.6} />
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !form.formState.isValid}>
                <IconDeviceFloppy size={16} stroke={1.6} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    );
  };

  const renderShareModal = () => (
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border/80 px-6 py-5">
          <DialogTitle>Share Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/70 px-3 py-2.5">
            <span className="text-sm font-medium text-foreground">
              Enable public link
            </span>
            <Switch checked={isShared} onCheckedChange={handleToggleShare} />
          </div>

          {isShared && shareableLink ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Share this URL to provide read access.
              </p>
              <div className="flex gap-2">
                <Input value={shareableLink} readOnly />
                <Button
                  type="button"
                  onClick={copyToClipboard}
                  variant="outline"
                  className="shrink-0"
                >
                  {isCopied ? (
                    <IconCheck size={16} stroke={1.6} />
                  ) : (
                    <IconCopy size={16} stroke={1.6} />
                  )}
                  {isCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/80 px-6 py-4">
          <Button
            type="button"
            onClick={() => setIsShareModalOpen(false)}
            variant="ghost"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen pb-20">
      <PageShell>
        <PageContainer className="max-w-4xl">
          {isLoading ? renderLoading() : renderContent()}
        </PageContainer>
      </PageShell>
      {renderShareModal()}
    </div>
  );
}
