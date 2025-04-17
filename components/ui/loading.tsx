"use client";

import { IconLoader2 } from "@tabler/icons-react";

interface LoadingProps {
  size?: number;
  text?: string;
}

export default function Loading({
  size = 36,
  text = "Loading...",
}: LoadingProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <IconLoader2 size={size} className="animate-spin text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
