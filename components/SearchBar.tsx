"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Command } from "cmdk";
import {
  IconFile,
  IconTag,
  IconSearch,
  IconHeartFilled,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "./ui/button";

type SearchResultType = "content" | "tag";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string | null;
  url: string;
  contentType?: string;
  isFavourite?: boolean;
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/search`, {
        params: { q: searchQuery },
        timeout: 5000,
      });

      setResults(response.data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: unknown) => {
      if (typeof value === "string") {
        performSearch(value);
      } else {
        console.error("Debounced search received non-string value:", value);
        performSearch("");
      }
    }, 300),
    [performSearch]
  );

  useEffect(() => {
    if (open) {
      debouncedSearch(query);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [query, open, debouncedSearch]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    window.open(result.url, "_blank");
  };

  const contentResults = results.filter((item) => item.type === "content");
  const tagResults = results.filter((item) => item.type === "tag");

  const getIcon = (result: SearchResult) => {
    if (result.type === "tag") {
      return <IconTag className="mr-2 h-4 w-4 shrink-0" />;
    }

    if (result.isFavourite) {
      return (
        <IconHeartFilled className="mr-2 h-4 w-4 shrink-0 text-rose-500" />
      );
    }

    return <IconFile className="mr-2 h-4 w-4 shrink-0" />;
  };

  return (
    <>
      <Button
        variant="outline"
        className="text-white border-white/20 bg-white/10 hover:bg-white/20"
        onClick={() => setOpen(true)}
      >
        <IconSearch className="h-4 w-4 mr-2" />
        Search...
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Command
              className="rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3">
                <IconSearch className="mr-2 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <Command.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search content, tags..."
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
                />
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto p-1">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <>
                    {query.trim() && results.length === 0 && (
                      <Command.Empty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No results found.
                      </Command.Empty>
                    )}

                    {!query.trim() && (
                      <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Type to start searching...
                      </div>
                    )}

                    {contentResults.length > 0 && (
                      <Command.Group
                        heading="Content"
                        className="px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-400"
                      >
                        {contentResults.map((result) => (
                          <Command.Item
                            key={result.id}
                            onSelect={() => handleSelect(result)}
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700"
                          >
                            {getIcon(result)}
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-medium truncate dark:text-white">
                                {result.title}
                              </span>
                              {result.description && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.description}
                                </span>
                              )}
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {tagResults.length > 0 && (
                      <>
                        {contentResults.length > 0 && (
                          <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                        )}
                        <Command.Group
                          heading="Tags"
                          className="px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-400"
                        >
                          {tagResults.map((result) => (
                            <Command.Item
                              key={result.id}
                              onSelect={() => handleSelect(result)}
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700"
                            >
                              {getIcon(result)}
                              <span className="dark:text-white">
                                {result.title}
                              </span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      </>
                    )}
                  </>
                )}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}

function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as (...args: Parameters<F>) => ReturnType<F>;
}
