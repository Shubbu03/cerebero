"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  IconX,
  IconLink,
  IconFileText,
  IconBrandTwitter,
  IconBrandYoutube,
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
import Loading from "./ui/loading";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["document", "tweet", "youtube", "link"], {
    errorMap: () => ({ message: "Invalid content type" }),
  }),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  body: z.string().optional().or(z.literal("")),
});

const contentTypes = [
  { value: "document", label: "Document", icon: IconFileText },
  { value: "tweet", label: "Tweet", icon: IconBrandTwitter },
  { value: "youtube", label: "YouTube", icon: IconBrandYoutube },
  { value: "link", label: "Link", icon: IconLink },
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
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (newContent: ContentFormValues & { tags: string[] }) => {
      return axios.post("/api/add-content", newContent);
    },
    onSuccess: () => {
      notify("Content added successfully", "success");
      queryClient.invalidateQueries({
        queryKey: ["userContent", session?.user.id],
      });

      form.reset();
      setSelectedTags([]);
      setSuggestedTags([]);
      onOpenChange(false);
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response) {
        console.error("API Error:", error.response.data);
      } else {
        console.error("Error adding content:", error);
      }
      notify("Error adding content", "error");
    },
  });

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "link",
      url: "",
      body: "",
    },
  });

  useEffect(() => {
    if (open && session?.user?.id) {
      fetchTags();
    }
  }, [open, session]);

  useEffect(() => {
    if (status === "authenticated" && !session?.user?.id) {
      update();
    }
  }, [session, status, update]);

  const title = form.watch("title");

  useEffect(() => {
    const debounceFetchSuggestions = setTimeout(() => {
      if (title && title.length > 3) {
        fetchSuggestedTags(title);
      }
    }, 2500);

    return () => clearTimeout(debounceFetchSuggestions);
  }, [title]);

  if (status === "loading") {
    return <Loading />;
  }

  const fetchTags = async () => {
    try {
      const response = await axios.get("/api/tags");
      setTags(response.data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchSuggestedTags = async (titleText: string) => {
    if (!titleText || titleText.length < 3) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get(
        `/api/suggest-tags?title=${encodeURIComponent(titleText)}`
      );

      if (response.data && response.data.suggestedTags) {
        setSuggestedTags(response.data.suggestedTags);
      }
    } catch (error) {
      console.error("Error fetching suggested tags:", error);
    } finally {
      setIsLoadingSuggestions(false);
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
        const response = await axios.post("/api/tags", {
          name: newTag.trim(),
        });

        const data = response.data;
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

  const onSubmit1 = async (values: ContentFormValues) => {
    try {
      if (!session?.user?.id) {
        console.error("User not authenticated");
        return;
      }

      const payload = {
        ...values,
        tags: selectedTags.map((tag) => tag.name),
      };
      await axios.post("/api/add-content", payload);

      form.reset();
      setSelectedTags([]);
      setSuggestedTags([]);
      onOpenChange(false);
      notify("Content added successfully", "success");

      await queryClient.invalidateQueries({
        queryKey: ["userContent", session.user.id],
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("API Error:", error.response.data);
      } else {
        console.error("Error adding content:", error);
      }
      notify("Error adding content", "error");
    }
  };

  const onSubmit = (values: ContentFormValues) => {
    if (!session?.user?.id) {
      console.error("User not authenticated");
      return;
    }

    const payload = {
      ...values,
      tags: selectedTags.map((tag) => tag.name),
    };

    mutate(payload);
  };

  const contentType = form.watch("type");

  const addSuggestedTag = async (tagName: string) => {
    if (!tagName.trim() || !session?.user?.id) return;

    try {
      const existingTag = tags.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );

      if (existingTag) {
        if (!selectedTags.some((tag) => tag.id === existingTag.id)) {
          setSelectedTags([...selectedTags, existingTag]);
        }
      } else {
        const response = await axios.post("/api/tags", {
          name: tagName.trim(),
        });

        const data = response.data;
        setTags([...tags, data]);
        setSelectedTags([...selectedTags, data]);
      }
    } catch (error) {
      console.error("Error adding suggested tag:", error);
    }
  };

  const filteredSuggestedTags = suggestedTags.filter(
    (tagName) =>
      !tags.some((tag) => tag.name.toLowerCase() === tagName.toLowerCase())
  );

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
              contentType === "tweet" ||
              contentType === "youtube") && (
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

            {contentType === "document" && (
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

              {filteredSuggestedTags.length > 0 && (
                <div>
                  <FormLabel className="text-sm text-zinc-400 flex items-center gap-2">
                    <span>AI Suggested Tags</span>
                    {isLoadingSuggestions && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                    )}
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filteredSuggestedTags.map((tagName, index) => {
                      const isSelected = selectedTags.some(
                        (t) => t.name.toLowerCase() === tagName.toLowerCase()
                      );

                      return (
                        <Badge
                          key={`suggested-${index}`}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer relative ${
                            isSelected
                              ? "bg-zinc-700 text-white hover:bg-zinc-600"
                              : "border-transparent text-zinc-300 hover:bg-zinc-800"
                          } overflow-hidden`}
                          style={{
                            padding: "0.25rem 0.5rem",
                            margin: "1px",
                          }}
                          onClick={() => addSuggestedTag(tagName)}
                        >
                          <span
                            className="absolute inset-0 rounded-md"
                            style={{
                              background:
                                "linear-gradient(90deg, #FF0000, #FF8000, #FFFF00, #00FF00, #0000FF, #8000FF, #FF0000)",
                              backgroundSize: "400% 400%",
                              animation: "rainbow-border 3s linear infinite",
                              opacity: 0.8,
                              zIndex: -1,
                            }}
                          />
                          <span
                            className="absolute inset-0.5 bg-zinc-800 rounded-sm"
                            style={{ zIndex: -1 }}
                          />
                          <span className="relative">{tagName}</span>
                        </Badge>
                      );
                    })}
                  </div>
                  <style jsx global>{`
                    @keyframes rainbow-border {
                      0% {
                        background-position: 0% 50%;
                      }
                      50% {
                        background-position: 100% 50%;
                      }
                      100% {
                        background-position: 0% 50%;
                      }
                    }
                  `}</style>
                </div>
              )}

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

            <DialogFooter className="flex flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 flex-1 sm:flex-none cursor-pointer"
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none cursor-pointer"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Content"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
