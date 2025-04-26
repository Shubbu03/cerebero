"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  IconX,
  IconLoader2,
  IconFileText,
  IconExternalLink,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { ContentItemData } from "@/app/tags/page";

interface TagContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagName: string;
  tagColor: string;
  content: ContentItemData[];
  isLoading: boolean;
}

export default function TagContentModal({
  isOpen,
  onClose,
  tagName,
  tagColor,
  content,
  isLoading,
}: TagContentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-neutral-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-100">
            <span
              className={`${tagColor} px-2 py-0.5 rounded-md text-sm font-medium`}
            >
              {tagName}
            </span>
            <span className="text-neutral-400">Content</span>
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-neutral-900 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-800">
            <IconX className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2 py-8 text-neutral-500">
              <IconLoader2 className="h-5 w-5 animate-spin" stroke={1.5} />
              <span>Loading content...</span>
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <p>No content found with this tag.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {content.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-neutral-700 rounded-md bg-neutral-800 hover:bg-neutral-750 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <IconFileText
                        className="h-5 w-5 text-neutral-400"
                        stroke={1.5}
                      />
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-neutral-200 truncate">
                          {item.title}
                        </h3>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 hover:text-neutral-200 transition-colors flex-shrink-0"
                            title="Open in new tab"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconExternalLink
                              className="h-4 w-4"
                              stroke={1.5}
                            />
                            <span className="sr-only">Open in new tab</span>
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">
                        Last updated{" "}
                        {formatDistanceToNow(new Date(item.updated_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-neutral-700 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
