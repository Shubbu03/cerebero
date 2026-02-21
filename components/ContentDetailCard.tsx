"use client";

import Link from "next/link";
import {
  IconBrandX,
  IconBrandYoutube,
  IconExternalLink,
  IconFileText,
  IconHeartFilled,
  IconLink,
  IconTrash,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";
import { useState } from "react";
import Pagination from "./Pagination";
import { formatDate } from "@/lib/format-date";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CONTENT_TYPE_ACCENTS } from "@/lib/design/tokens";

type Origin = "Favourites" | "All_Content";

interface ContentDetailCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
  origin: Origin;
  onDelete?: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

const contentTypes = {
  document: { label: "Document", icon: IconFileText },
  tweet: { label: "Tweet", icon: IconBrandX },
  youtube: { label: "YouTube", icon: IconBrandYoutube },
  link: { label: "Link", icon: IconLink },
};

const getDomain = (url: string | null) => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
};

export function ContentDetailCard({
  content,
  isLoading,
  username,
  onDelete,
}: ContentDetailCardProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = [...content].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const items = sorted.slice(start, start + ITEMS_PER_PAGE);

  const onCardClick = (id: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("a,button")) {
      return;
    }
    router.push(`/content/${id}`);
  };

  return (
    <section className="surface-soft rounded-2xl p-4 sm:p-5">
      {isLoading ? (
        <p className="py-5 text-center text-muted-foreground">Loading items...</p>
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No content available.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const config =
                contentTypes[item.type as keyof typeof contentTypes] ??
                contentTypes.document;
              const Icon = config.icon;
              const accentClass =
                CONTENT_TYPE_ACCENTS[item.type] ?? CONTENT_TYPE_ACCENTS.document;

              return (
                <article
                  key={item.id}
                  className="flex cursor-pointer flex-col rounded-xl border border-border/80 bg-card p-4 transition hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                  onClick={(event) => onCardClick(item.id, event)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge className={`gap-1.5 ${accentClass}`}>
                      <Icon size={13} />
                      {config.label}
                    </Badge>
                    {item.url ? (
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <IconExternalLink size={15} />
                      </Link>
                    ) : null}
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
                  {item.body ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </p>
                  ) : item.url ? (
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      {getDomain(item.url)}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-foreground">
                        {username ? username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete?.(item.id);
                        }}
                      >
                        <IconTrash size={15} />
                      </button>
                      {item.is_favourite ? (
                        <IconHeartFilled size={15} className="text-primary" />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        </>
      )}
    </section>
  );
}
