"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`mt-6 flex items-center justify-end gap-2 ${className}`}
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className={`rounded-md p-1 ${
          currentPage === 1
            ? "cursor-not-allowed text-muted-foreground/50"
            : "text-muted-foreground hover:bg-accent"
        }`}
        aria-label="Previous page"
      >
        <IconChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const shouldShow =
            page === 1 ||
            page === totalPages ||
            Math.abs(currentPage - page) <= 1;

          if (!shouldShow) {
            if (
              (page === 2 && currentPage > 3) ||
              (page === totalPages - 1 && currentPage < totalPages - 2)
            ) {
              return (
                <span
                  key={`ellipsis-${page}`}
                  className="px-1 text-muted-foreground"
                >
                  ...
                </span>
              );
            }
            return null;
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={`rounded-md p-1 ${
          currentPage === totalPages
            ? "cursor-not-allowed text-muted-foreground/50"
            : "text-muted-foreground hover:bg-accent"
        }`}
        aria-label="Next page"
      >
        <IconChevronRight size={20} />
      </button>
    </nav>
  );
}
