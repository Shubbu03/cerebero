"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBrain,
  IconFile,
  IconHeartFilled,
  IconSearch,
  IconTag,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { apiGet } from "@/lib/api/client";
import { SearchResultDTO } from "@/lib/api/types";

interface SearchBarProps {
  compact?: boolean;
}

export function SearchBar({ compact = false }: SearchBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const contentResults = useMemo(
    () => results.filter((item) => item.type === "content"),
    [results]
  );
  const tagResults = useMemo(
    () => results.filter((item) => item.type === "tag"),
    [results]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || aiEnabled) {
      return;
    }

    if (!query.trim()) {
      setResults([]);
      setHasAttempted(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setHasAttempted(true);
      try {
        const data = await apiGet<{ results: SearchResultDTO[] }>("/api/search", {
          params: { q: query, ai: false },
        });
        setResults(data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeout);
  }, [open, query, aiEnabled]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setHasAttempted(false);
      setAiEnabled(false);
    }
  }, [open]);

  const runAiSearch = async () => {
    if (!query.trim()) {
      return;
    }

    setIsLoading(true);
    setHasAttempted(true);
    try {
      const data = await apiGet<{ results: SearchResultDTO[] }>("/api/search", {
        params: { q: query, ai: true },
      });
      setResults(data.results || []);
    } catch (error) {
      console.error("AI search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: SearchResultDTO) => {
    setOpen(false);
    if (item.url.startsWith("http")) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.url);
  };

  const renderIcon = (result: SearchResultDTO) => {
    if (result.type === "tag") {
      return <IconTag size={16} className="text-muted-foreground" />;
    }
    if (result.isFavourite) {
      return <IconHeartFilled size={16} className="text-primary" />;
    }
    return <IconFile size={16} className="text-muted-foreground" />;
  };

  return (
    <>
      <Button
        variant="outline"
        className={
          compact
            ? "h-10 w-10 rounded-full border-border/70 bg-card/65 p-0 text-muted-foreground hover:bg-accent"
            : "h-10 min-w-[220px] justify-start rounded-xl border-border/70 bg-card/65 text-muted-foreground hover:bg-accent"
        }
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <IconSearch size={16} className={compact ? "" : "mr-2"} />
        {!compact ? (
          <>
            <span className="text-sm">Search content…</span>
            <kbd className="ml-auto rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
              ⌘K
            </kbd>
          </>
        ) : null}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 border-b border-border/70 px-4 pb-3 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
              aria-label="Toggle AI search"
            />
            <IconBrain
              size={14}
              className={aiEnabled ? "text-primary" : "text-muted-foreground"}
            />
            <span>AI mode</span>
          </div>
          {aiEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="ml-auto rounded-lg"
              onClick={runAiSearch}
              disabled={isLoading || !query.trim()}
            >
              Search
            </Button>
          ) : null}
        </div>

        <CommandInput
          value={query}
          onValueChange={setQuery}
          onKeyDown={(event) => {
            if (aiEnabled && event.key === "Enter") {
              event.preventDefault();
              runAiSearch();
            }
          }}
          placeholder={
            aiEnabled
              ? "Type query and press Search for semantic results"
              : "Search title, body, tags"
          }
        />
        <CommandList>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Searching…</div>
          ) : null}

          {!isLoading && !query.trim() ? (
            <div className="p-4 text-sm text-muted-foreground">
              Start typing to search your knowledge base.
            </div>
          ) : null}

          {!isLoading && hasAttempted && query.trim() && results.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : null}

          {contentResults.length > 0 ? (
            <CommandGroup heading="Content">
              {contentResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="cursor-pointer gap-2 rounded-md"
                >
                  {renderIcon(result)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    {result.description ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {result.description}
                      </p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {contentResults.length > 0 && tagResults.length > 0 ? (
            <CommandSeparator />
          ) : null}

          {tagResults.length > 0 ? (
            <CommandGroup heading="Tags">
              {tagResults.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="cursor-pointer gap-2 rounded-md"
                >
                  {renderIcon(result)}
                  <span className="text-sm">{result.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
