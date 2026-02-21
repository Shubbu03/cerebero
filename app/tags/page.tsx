"use client";

import { useState } from "react";
import {
  IconEdit,
  IconTrash,
  IconLoader2,
  IconCirclePlus,
  IconX,
  IconCheck,
  IconTagsFilled,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loading from "@/components/ui/loading";
import TagContentModal from "@/components/TagContentModal";
import { useSuspenseQueries } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import {
  PageContainer,
  PageShell,
  SectionHeader,
} from "@/components/layout/PageShell";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

interface TagData {
  id: string;
  name: string;
  created_at: string;
}

export interface ContentItemData {
  id: string;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
}

interface TopTagData {
  tagId: string;
  tagName: string;
  usageCount: number;
  content: ContentItemData[];
}

interface SelectedTag {
  tagId: string;
  tagName: string;
  content: ContentItemData[];
  colorClass: string;
}

const BADGE_COLORS = [
  "bg-blue-600 hover:bg-blue-700",
  "bg-purple-600 hover:bg-purple-700",
  "bg-emerald-600 hover:bg-emerald-700",
  "bg-orange-600 hover:bg-orange-700",
  "bg-rose-600 hover:bg-rose-700",
];

export default function TagsDashboard() {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createTagName, setCreateTagName] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTagModal, setSelectedTagModal] = useState<SelectedTag | null>(
    null
  );

  const results = useSuspenseQueries({
    queries: [
      {
        queryKey: ["allTags"],
        queryFn: async () => {
          const response = await apiGet<TagData[]>("/api/tags");
          return response.sort((a, b) => a.name.localeCompare(b.name));
        },
      },
      {
        queryKey: ["topTagsWithContent"],
        queryFn: async () => {
          const response = await apiGet<{ topTags: TopTagData[] }>(
            "/api/tags/top-with-content",
            {
              params: { tagLimit: 5, contentLimit: 5 },
            }
          );
          return response.topTags || [];
        },
      },
    ],
  });

  const allTags = results[0].data as TagData[];
  const topTagsWithContent = results[1].data as TopTagData[];
  const refetchAllTags = results[0].refetch;
  const refetchTopTags = results[1].refetch;

  const handleTagClick = (tag: TopTagData, colorClass: string) => {
    setSelectedTagModal({
      tagId: tag.tagId,
      tagName: tag.tagName,
      content: tag.content,
      colorClass: colorClass,
    });
  };

  const closeModal = () => {
    setSelectedTagModal(null);
  };

  const handleEditClick = (tag: TagData) => {
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setNewTagName("");
  };

  const handleSaveEdit = async (tagId: string) => {
    if (
      !newTagName.trim() ||
      newTagName.trim() === allTags.find((t) => t.id === tagId)?.name
    ) {
      handleCancelEdit();
      return;
    }
    try {
      await apiPut<TagData>(`/api/tags/${tagId}`, {
        name: newTagName.trim(),
      });
      await refetchAllTags();
      await refetchTopTags();
      notify("Tag updated successfully", "success");
      setEditingTagId(null);
      setNewTagName("");
    } catch (err) {
      notify("Error updating tag", "error");
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;
    setIsDeleting(true);
    try {
      await apiDelete(`/api/tags/${tagToDelete.id}`);
      await refetchAllTags();
      await refetchTopTags();
      notify("Tag deleted successfully", "success");
      setTagToDelete(null);
    } catch (err) {
      notify("Error deleting tag", "error");
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTag = async () => {
    const trimmedName = createTagName.trim();
    if (!trimmedName) return;
    if (
      allTags.some(
        (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setCreateTagName("");
      setIsCreating(false);
      return;
    }
    setIsSubmittingCreate(true);
    try {
      await apiPost("/api/tags", { name: trimmedName });
      await refetchAllTags();
      await refetchTopTags();
      notify("New tag created successfully", "success");
      setCreateTagName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Error creating tag:", err);
      notify("Error creating new tag", "error");
      throw err;
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const renderLoading = (text: string) => (
    <div className="flex items-center justify-center space-x-2 py-6 text-neutral-500">
      <Loading text={text} />
    </div>
  );

  const renderTagCreationForm = () => (
    <div className="flex items-center space-x-2 mt-2 mb-4 px-1">
      <Input
        type="text"
        placeholder="New tag name..."
        value={createTagName}
        onChange={(e) => setCreateTagName(e.target.value)}
        className="h-9 flex-grow bg-neutral-900 border-neutral-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 placeholder:text-neutral-400 text-white"
        disabled={isSubmittingCreate}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreateTag();
          if (e.key === "Escape") setIsCreating(false);
        }}
        autoFocus
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCreateTag}
        disabled={isSubmittingCreate || !createTagName.trim()}
        className="h-9 w-9 flex-shrink-0 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
        aria-label="Confirm create tag"
      >
        {isSubmittingCreate ? (
          <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
        ) : (
          <IconCheck className="h-5 w-5 text-green-400" stroke={1.5} />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsCreating(false)}
        disabled={isSubmittingCreate}
        className="h-9 w-9 flex-shrink-0 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
        aria-label="Cancel create tag"
      >
        <IconX className="h-5 w-5 text-red-400" stroke={1.5} />
      </Button>
    </div>
  );

  const renderTagItem = (tag: TagData) => (
    <div
      key={tag.id}
      className="flex items-center justify-between p-3 border border-transparent hover:border-neutral-500 transition-all duration-200 ease-in-out cursor-pointer rounded-lg bg-neutral-800 hover:bg-neutral-750 group min-h-[52px]"
    >
      {editingTagId === tag.id ? (
        <div className="flex-grow flex items-center space-x-2 mr-1">
          <Input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="h-8 bg-neutral-700 border-neutral-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit(tag.id);
              if (e.key === "Escape") handleCancelEdit();
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 flex-shrink-0 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
            onClick={() => handleSaveEdit(tag.id)}
            aria-label="Save tag name"
          >
            <IconCheck className="h-4 w-4 text-green-400" stroke={1.5} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 flex-shrink-0 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer"
            onClick={handleCancelEdit}
            aria-label="Cancel edit"
          >
            <IconX className="h-4 w-4 text-red-400" stroke={1.5} />
          </Button>
        </div>
      ) : (
        <span
          className="flex-grow truncate mr-2 font-medium text-neutral-100"
          title={tag.name}
        >
          {tag.name}
        </span>
      )}

      {editingTagId !== tag.id && (
        <div className="flex items-center space-x-1 flex-shrink-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-300 hover:text-blue-400 hover:bg-neutral-700 cursor-pointer"
            onClick={() => handleEditClick(tag)}
            aria-label={`Edit tag ${tag.name}`}
          >
            <IconEdit className="h-4 w-4" stroke={1.5} />
          </Button>

          <AlertDialog
            open={tagToDelete?.id === tag.id}
            onOpenChange={(open) => !open && setTagToDelete(null)}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-neutral-300 hover:text-red-400 hover:bg-neutral-700 cursor-pointer"
                onClick={() => setTagToDelete(tag)}
                aria-label={`Delete tag ${tag.name}`}
              >
                <IconTrash className="h-4 w-4" stroke={1.5} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-neutral-900 border-neutral-600 text-neutral-100 max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
                <AlertDialogDescription className="text-neutral-300 pt-1">
                  This action cannot be undone. This will permanently delete the
                  tag &quot;{tagToDelete?.name}&quot; and remove it from all
                  associated content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel
                  onClick={() => setTagToDelete(null)}
                  disabled={isDeleting}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-600 focus-visible:ring-neutral-500 cursor-pointer"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400 cursor-pointer"
                >
                  {isDeleting && (
                    <IconLoader2
                      className="mr-2 h-4 w-4 animate-spin"
                      stroke={1.5}
                    />
                  )}
                  Delete Tag
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <PageContainer>
        <SectionHeader
          title="Tags"
          subtitle="Organize your knowledge graph with reusable labels."
          action={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconTagsFilled className="h-4 w-4" />
              <span>{allTags.length} total</span>
            </div>
          }
        />

        <div className="mb-6 sm:mb-8 surface-soft rounded-2xl p-4 sm:p-5">
          <h2 className="mb-3 text-base font-medium text-muted-foreground">
            Top Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {results[1].isPending ? (
              <div className="flex w-full items-center space-x-2 py-1 text-muted-foreground">
                <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
                <span className="text-sm">Loading top tags...</span>
              </div>
            ) : topTagsWithContent.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                No tags have been used yet.
              </p>
            ) : (
              topTagsWithContent.map((tag, index) => {
                const colorClass = BADGE_COLORS[index % BADGE_COLORS.length];
                return (
                  <Badge
                    key={tag.tagId}
                    variant="default"
                    className={`cursor-pointer px-2.5 py-1 text-sm font-medium text-white transition-colors ${colorClass}`}
                    onClick={() => handleTagClick(tag, colorClass)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTagClick(tag, colorClass);
                      }
                    }}
                  >
                    {tag.tagName}
                    {tag.usageCount ? (
                      <span className="ml-1.5 text-xs opacity-80">
                        ({tag.usageCount})
                      </span>
                    ) : null}
                  </Badge>
                );
              })
            )}
          </div>
        </div>

        <div className="surface-soft rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-medium text-muted-foreground">All Tags</h2>
              {!results[0].isPending && allTags.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  Total tags: {allTags.length}
                </div>
              ) : null}
            </div>
            {!isCreating ? (
              <Button
                variant="outline"
                onClick={() => setIsCreating(true)}
                className="h-8 cursor-pointer border-border/80 px-3 py-1 text-sm"
                size="sm"
              >
                <IconCirclePlus className="mr-1.5 h-4 w-4" stroke={1.5} />
                New Tag
              </Button>
            ) : null}
          </div>

          {isCreating ? renderTagCreationForm() : null}

          <div className="space-y-2">
            {results[0].isPending ? (
              renderLoading("Loading tags...")
            ) : allTags.length === 0 && !isCreating ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-surface-2 py-10 px-4 text-center">
                <p className="text-muted-foreground">No tags created yet.</p>
                <Button
                  variant="link"
                  onClick={() => setIsCreating(true)}
                  className="mt-2 px-0"
                >
                  Create your first tag
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {allTags.map(renderTagItem)}
              </div>
            )}
          </div>
        </div>

        {selectedTagModal ? (
          <TagContentModal
            isOpen={!!selectedTagModal}
            onClose={closeModal}
            tagName={selectedTagModal.tagName}
            tagColor={selectedTagModal.colorClass}
            content={selectedTagModal.content}
            isLoading={false}
          />
        ) : null}
      </PageContainer>
    </PageShell>
  );
}
