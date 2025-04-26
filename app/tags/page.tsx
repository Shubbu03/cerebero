"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
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

interface TagData {
  id: string;
  name: string;
  created_at: string;
}

interface ContentItemData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface TopTagData {
  tagId: string;
  tagName: string;
  usageCount: number;
  content: ContentItemData[];
}

const BADGE_COLORS = [
  "bg-blue-600 hover:bg-blue-700",
  "bg-purple-600 hover:bg-purple-700",
  "bg-emerald-600 hover:bg-emerald-700",
  "bg-orange-600 hover:bg-orange-700",
  "bg-rose-600 hover:bg-rose-700",
];

export default function TagsDashboard() {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [topTagsWithContent, setTopTagsWithContent] = useState<TopTagData[]>(
    []
  );
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createTagName, setCreateTagName] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAllTags = useCallback(async () => {
    setIsLoadingAll(true);
    try {
      const response = await axios.get<TagData[]>("/api/tags");
      const sortedTags = response.data.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setAllTags(sortedTags);
    } catch (err) {
      console.error("Error fetching all tags:", err);
    } finally {
      setIsLoadingAll(false);
    }
  }, []);

  const fetchTopTags = useCallback(async () => {
    setIsLoadingTop(true);
    try {
      const response = await axios.get<{ topTags: TopTagData[] }>(
        "/api/tags/top-with-content",
        {
          params: { tagLimit: 5, contentLimit: 5 },
        }
      );
      setTopTagsWithContent(response.data.topTags || []);
    } catch (err) {
      console.error("Error fetching top tags:", err);
    } finally {
      setIsLoadingTop(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTags();
    fetchTopTags();
  }, [fetchAllTags, fetchTopTags]);

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
      const response = await axios.put<TagData>(`/api/tags/${tagId}`, {
        name: newTagName.trim(),
      });
      const updatedTag = response.data;

      setAllTags((prevTags) =>
        prevTags
          .map((tag) =>
            tag.id === tagId ? { ...tag, name: updatedTag.name } : tag
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setTopTagsWithContent((prevTopTags) =>
        prevTopTags.map((tag) =>
          tag.tagId === tagId ? { ...tag, tagName: updatedTag.name } : tag
        )
      );

      setEditingTagId(null);
      setNewTagName("");
    } catch (err) {
      console.error("Error updating tag:", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;
    setIsDeleting(true);

    try {
      await axios.delete(`/api/tags/${tagToDelete.id}`);

      setAllTags((prevTags) =>
        prevTags.filter((tag) => tag.id !== tagToDelete.id)
      );
      fetchTopTags();

      setTagToDelete(null);
    } catch (err) {
      console.error("Error deleting tag:", err);
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
      console.warn("Attempted to create a duplicate tag.");
      setCreateTagName("");
      setIsCreating(false);
      return;
    }

    setIsSubmittingCreate(true);

    try {
      await axios.post("/api/tags", { name: trimmedName });
      await fetchAllTags();
      fetchTopTags();
      setCreateTagName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Error creating tag:", err);
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
    <div className="p-4 sm:p-6 text-neutral-200 min-h-screen">
<<<<<<< HEAD
=======
      {/* Fixed header with better alignment between icon and text */}
>>>>>>> 1dd7342b7a84bfd505af49b7fcf82c79c22f2477
      <div className="flex items-center mb-6 sm:mb-8">
        <IconTagsFilled className="h-5 w-5 mr-2" />
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-100">
          Tags
        </h1>
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="text-base font-medium mb-3 text-neutral-400">
          Top Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {isLoadingTop ? (
            <div className="flex items-center space-x-2 py-1 text-neutral-500 w-full">
              <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
              <span className="text-sm">Loading top tags...</span>
            </div>
          ) : topTagsWithContent.length === 0 ? (
            <p className="text-neutral-500 italic text-sm">
              No tags have been used yet.
            </p>
          ) : (
            topTagsWithContent.map((tag, index) => (
              <Badge
                key={tag.tagId}
                variant="default"
                className={`px-2.5 py-0.5 ${
                  BADGE_COLORS[index % BADGE_COLORS.length]
                } text-white text-sm font-medium transition-colors`}
              >
                {tag.tagName}
              </Badge>
            ))
          )}
        </div>
      </div>

<<<<<<< HEAD
=======
      {/* All Tags Section with total count before new tag button */}
>>>>>>> 1dd7342b7a84bfd505af49b7fcf82c79c22f2477
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-medium text-neutral-400">All Tags</h2>
            {!isLoadingAll && allTags.length > 0 && (
              <div className="text-sm text-neutral-500">
                Total tags: {allTags.length}
              </div>
            )}
          </div>
          {!isCreating && (
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              className="border-neutral-700 hover:bg-neutral-800 hover:text-neutral-100 text-neutral-300 py-1 px-3 h-8 text-sm"
              size="sm"
            >
              <IconCirclePlus className="h-4 w-4 mr-1.5" stroke={1.5} />
              New Tag
            </Button>
          )}
        </div>

        {isCreating && renderTagCreationForm()}

        <div className="space-y-2">
          {isLoadingAll ? (
            renderLoading("Loading tags...")
          ) : allTags.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-neutral-900 rounded-lg border border-neutral-800">
              <p className="text-neutral-400">No tags created yet.</p>
              <Button
                variant="link"
                onClick={() => setIsCreating(true)}
                className="mt-2 text-blue-500 hover:text-blue-400 px-0"
              >
                Create your first tag
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {allTags.map(renderTagItem)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
