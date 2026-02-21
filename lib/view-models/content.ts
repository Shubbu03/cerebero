import { UserContentDTO } from "@/lib/api/types";

export type ContentCardVM = {
  id: string;
  title: string;
  type: UserContentDTO["type"];
  url: string | null;
  body: string | null;
  isFavourite: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toContentCardVM(content: UserContentDTO): ContentCardVM {
  return {
    id: content.id,
    title: content.title,
    type: content.type,
    url: content.url,
    body: content.body,
    isFavourite: content.is_favourite,
    createdAt: content.created_at,
    updatedAt: content.updated_at,
  };
}
