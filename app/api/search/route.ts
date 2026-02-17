import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ai } from "@/lib/gen-ai";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord } from "@/lib/backend/content-mapper";

type EmbeddingItem = {
  contentId: string;
  embedding: number[];
  content: ConvexContentRecord;
};

type TagRecord = {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

const CONTENT_PATHS = {
  searchByText: "content:searchByText",
  listEmbeddingsWithContentByUser: "content:listEmbeddingsWithContentByUser",
} as const;

const TAG_PATHS = {
  listByUser: "tags:listByUser",
} as const;

function toSearchContentResult(item: ConvexContentRecord) {
  return {
    id: item.id,
    type: "content",
    contentType: item.type,
    title: item.title,
    description: item.body
      ? `${item.body.substring(0, 60)}${item.body.length > 60 ? "..." : ""}`
      : null,
    url: item.url || `/content/${item.id}`,
    isFavourite: item.isFavourite,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const isAI = url.searchParams.get("ai") === "true";

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    if (isAI) {
      try {
        const embedResp = await ai.models.embedContent({
          model: "gemini-embedding-exp-03-07",
          contents: query,
          config: { taskType: "RETRIEVAL_QUERY" },
        });

        const queryEmbedding = embedResp.embeddings?.[0]?.values;
        if (!queryEmbedding) {
          throw new Error("No embedding returned");
        }

        const embeddingData = await callConvex<EmbeddingItem[]>(
          "query",
          CONTENT_PATHS.listEmbeddingsWithContentByUser,
          {
            userId,
          }
        );

        const formattedSearchResult = embeddingData
          .map((item) => ({
            content: item.content,
            similarity: cosineSimilarity(item.embedding, queryEmbedding),
          }))
          .filter((item) => item.similarity >= 0.65)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5)
          .map((item) => toSearchContentResult(item.content));

        return NextResponse.json(
          { results: formattedSearchResult },
          { status: 200 }
        );
      } catch (e) {
        console.error("AI Semantic Search Error:", e);
      }
    }

    const contentResults = await callConvex<ConvexContentRecord[]>(
      "query",
      CONTENT_PATHS.searchByText,
      {
        userId,
        q: query,
        limit: 5,
      }
    );

    const allTags = await callConvex<TagRecord[]>("query", TAG_PATHS.listByUser, {
      userId,
    });

    const normalizedQuery = query.trim().toLowerCase();

    const tagResults = allTags
      .filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);

    const formattedContent = contentResults.map(toSearchContentResult);

    const formattedTags = tagResults.map((tag: TagRecord) => ({
      id: tag.id,
      type: "tag",
      title: tag.name,
      url: `/tags`,
    }));

    const results = [...formattedContent, ...formattedTags];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
