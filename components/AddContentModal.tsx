"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconX,
  IconLink,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconFile,
} from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Content type is required"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  body: z.string().optional(),
  is_shared: z.boolean().default(false),
});

const contentTypes = [
  { value: "link", label: "Link", icon: IconLink },
  { value: "note", label: "Note", icon: IconFileText },
  { value: "image", label: "Image", icon: IconPhoto },
  { value: "video", label: "Video", icon: IconVideo },
  { value: "file", label: "File", icon: IconFile },
];

type ContentFormValues = z.infer<typeof formSchema>;

type Tag = {
  id: string;
  name: string;
  user_id: string;
};

type AddContentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddContentModal({
  open,
  onOpenChange,
}: AddContentModalProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "link",
      url: "",
      body: "",
      is_shared: false,
    },
  });

  useEffect(() => {
    if (open && session?.user?.id) {
      fetchTags();
    }
  }, [open, session]);

  const fetchTags = async () => {
    try {
      if (!session?.user?.id) return;

      const response = await fetch("/api/tags", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const data = await response.json();
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const addTag = async () => {
    if (!newTag.trim() || !session?.user?.id) return;

    try {
      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === newTag.toLowerCase()
      );

      if (existingTag) {
        if (!selectedTags.some((tag) => tag.id === existingTag.id)) {
          setSelectedTags([...selectedTags, existingTag]);
        }
      } else {
        const response = await fetch("/api/tags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTag.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create tag");
        }

        const data = await response.json();
        setTags([...tags, data]);
        setSelectedTags([...selectedTags, data]);
      }

      setNewTag("");
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  };

  const toggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
  };

  const onSubmit = async (values: ContentFormValues) => {
    try {
      if (!session?.user?.id) {
        console.error("User not authenticated");
        return;
      }

      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          tags: selectedTags.map((tag) => tag.id),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create content");
      }

      form.reset();
      setSelectedTags([]);
      onOpenChange(false);

      router.refresh();
    } catch (error) {
      console.error("Error adding content:", error);
    }
  };

  const contentType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add New Content
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Add a new item to your collection. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a title"
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {contentTypes.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          className="flex items-center gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(contentType === "link" ||
              contentType === "image" ||
              contentType === "video") && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://"
                        {...field}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(contentType === "note" || contentType === "file") && (
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your content here..."
                        {...field}
                        className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="is_shared"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Make this content shareable
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="bg-zinc-700 text-white hover:bg-zinc-600"
                    >
                      {tag.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 text-zinc-400 hover:text-white hover:bg-transparent"
                        onClick={() => removeTag(tag.id)}
                      >
                        <IconX className="h-3 w-3" />
                        <span className="sr-only">Remove {tag.name}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {tags.length > 0 && (
                <div>
                  <FormLabel className="text-sm text-zinc-400">
                    Existing Tags
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={
                          selectedTags.some((t) => t.id === tag.id)
                            ? "default"
                            : "outline"
                        }
                        className={
                          selectedTags.some((t) => t.id === tag.id)
                            ? "bg-zinc-700 text-white hover:bg-zinc-600 cursor-pointer"
                            : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                        }
                        onClick={() => toggleTag(tag)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Add Content
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
