export type ConvexContentRecord = {
  id: string;
  userId: string;
  title: string;
  type: "document" | "tweet" | "youtube" | "link";
  url: string | null;
  body: string | null;
  isShared: boolean;
  isFavourite: boolean;
  shareId: string | null;
  createdAt: number;
  updatedAt: number;
};

export function toApiContent(content: ConvexContentRecord) {
  return {
    id: content.id,
    user_id: content.userId,
    title: content.title,
    type: content.type,
    url: content.url,
    body: content.body,
    is_shared: content.isShared,
    is_favourite: content.isFavourite,
    share_id: content.shareId,
    created_at: new Date(content.createdAt).toISOString(),
    updated_at: new Date(content.updatedAt).toISOString(),
  };
}
