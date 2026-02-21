export const BRAND = {
  name: "Cerebero",
  accent: "oklch(0.58 0.17 15)",
  accentSoft: "oklch(0.72 0.07 18)",
  silver: "oklch(0.78 0.01 230)",
} as const;

export const CONTENT_TYPE_ACCENTS: Record<string, string> = {
  document: "bg-calm-blue text-calm-blue-foreground",
  tweet: "bg-calm-ink text-calm-ink-foreground",
  youtube: "bg-calm-red text-calm-red-foreground",
  link: "bg-calm-violet text-calm-violet-foreground",
};
