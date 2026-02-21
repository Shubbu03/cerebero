export type ContentType = "document" | "tweet" | "youtube" | "link";

export interface UserContentDTO {
  id: string;
  user_id: string;
  title: string;
  type: ContentType;
  url: string | null;
  body: string | null;
  is_shared: boolean;
  is_favourite: boolean;
  share_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiMessageResponse {
  message?: string;
}

export interface UserContentListResponse extends ApiMessageResponse {
  data?: UserContentDTO[];
}

export interface UserContentItemResponse extends ApiMessageResponse {
  data?: UserContentDTO;
  content?: UserContentDTO;
}

export interface TagDTO {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface TodoDTO {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface SearchResultDTO {
  id: string;
  type: "content" | "tag";
  title: string;
  description?: string | null;
  url: string;
  contentType?: ContentType;
  isFavourite?: boolean;
  createdAt?: string;
}
