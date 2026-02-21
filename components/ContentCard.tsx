"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconBrandX,
  IconBrandYoutube,
  IconClock,
  IconFileText,
  IconHeartFilled,
  IconLink,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { UserContent } from "@/app/dashboard/page";
import { formatDate } from "@/lib/format-date";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CONTENT_TYPE_ACCENTS } from "@/lib/design/tokens";

type Origin = "Recents" | "Profile_Shared";

interface ContentCardProps {
  content: UserContent[];
  isLoading: boolean;
  username: string;
  origin: Origin;
  onDelete?: (id: string) => void;
}

const contentTypes = {
  document: { label: "Document", icon: IconFileText },
  tweet: { label: "Tweet", icon: IconBrandX },
  youtube: { label: "YouTube", icon: IconBrandYoutube },
  link: { label: "Link", icon: IconLink },
};

export function ContentCard({
  content,
  isLoading,
  username,
  origin,
  onDelete,
}: ContentCardProps) {
  const router = useRouter();
  const recentItems = [...content]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 6);

  const handleCardClick = (contentId: string, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("a,button")) {
      return;
    }
    router.push(`/content/${contentId}`);
  };

  return (
    <section className="mb-6 surface-soft rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        {origin === "Recents" ? (
          <h2 className="flex items-center gap-2 text-fluid-lg font-semibold">
            <IconClock size={18} className="text-primary" />
            Recents
          </h2>
        ) : (
          <h2 className="flex items-center gap-2 text-fluid-lg font-semibold">
            <IconShare size={18} className="text-primary" />
            Recently Shared
          </h2>
        )}

        {content.length > 0 && origin === "Recents" ? (
          <Link href="/content">
            <Button variant="link" className="h-auto p-0 text-sm">
              View all
            </Button>
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-muted-foreground">Loading items...</p>
      ) : recentItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {recentItems.map((item) => {
            const typeKey = item.type as keyof typeof contentTypes;
            const config = contentTypes[typeKey] ?? contentTypes.document;
            const Icon = config.icon;
            const accentClass =
              CONTENT_TYPE_ACCENTS[item.type] ?? CONTENT_TYPE_ACCENTS.document;

            return (
              <article
                key={item.id}
                onClick={(event) => handleCardClick(item.id, event)}
                className="group relative flex min-h-[176px] cursor-pointer flex-col rounded-xl border border-border/80 bg-card p-3.5 transition hover:-translate-y-0.5 hover:border-border hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <Badge className={`gap-1.5 ${accentClass}`}>
                    <Icon size={13} />
                    {config.label}
                  </Badge>
                  {item.type !== "document" && item.url ? (
                    <Link
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                    >
                      <IconLink size={16} />
                    </Link>
                  ) : null}
                </div>

                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {item.title || "Untitled"}
                </p>
                {item.body ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
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
      ) : (
        <p className="py-6 text-center text-muted-foreground">No items found.</p>
      )}
    </section>
  );
}
