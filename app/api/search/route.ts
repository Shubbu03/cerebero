import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authOptions } from "../auth/[...nextauth]/options";
import { ai } from "@/lib/gen-ai";

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
      type SemanticSearchResultItem = {
        id: string;
        title: string;
        type: string;
        url: string | null;
        body: string | null;
        created_at: string;
        is_favourite: boolean | null;
        user_id: string;
        similarity?: number;
      };
      let semanticResults: SemanticSearchResultItem[] = [];

      try {
        const embedResp = await ai.models.embedContent({
          model: "gemini-embedding-exp-03-07",
          contents: query,
          config: { taskType: "RETRIEVAL_QUERY" },
        });

        const embedding = embedResp.embeddings?.[0]?.values;
        if (!embedding) throw new Error("No embedding returned");

        const { data: semanticData, error: semanticError } =
          await supabaseAdmin.rpc("match_content", {
            query_embedding: embedding,
            match_count: 5,
          });

        if (semanticError) {
          console.error("Semantic match error:", semanticError);
          return NextResponse.json(
            { error: "Failed to search" },
            { status: 500 }
          );
        } else {
          semanticResults = semanticData
            .filter((item: SemanticSearchResultItem) => item.user_id === userId)
            .filter(
              (item: SemanticSearchResultItem) =>
                item.similarity && item.similarity >= 0.65
            );
        }

        const formattedSearchResult = semanticResults.map((item) => ({
          id: item.id,
          type: "content",
          contentType: item.type,
          title: item.title,
          description: item.body
            ? `${item.body.substring(0, 60)}${
                item.body.length > 60 ? "..." : ""
              }`
            : null,
          url: item.url || `/content/${item.id}`,
          isFavourite: item.is_favourite,
          createdAt: item.created_at,
        }));
        return NextResponse.json(
          { results: formattedSearchResult },
          { status: 200 }
        );
      } catch (e) {
        console.error("AI Semantic Search Error:", e);
      }
    }

    const { data: contentResults, error: contentError } = await supabaseAdmin
      .from("content")
      .select("id, title, type, url, body, created_at, is_favourite")
      .eq("user_id", userId)
      .or(`title.ilike.%${query}%, body.ilike.%${query}%`)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (contentError) {
      console.error("Content search error:", contentError);
      return NextResponse.json(
        { error: "Failed to search content" },
        { status: 500 }
      );
    }

    const { data: tagResults, error: tagError } = await supabaseAdmin
      .from("tags")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(5);

    if (tagError) {
      console.error("Tag search error:", tagError);
      return NextResponse.json(
        { error: "Failed to search tags" },
        { status: 500 }
      );
    }

    const formattedContent = contentResults.map((item) => ({
      id: item.id,
      type: "content",
      contentType: item.type,
      title: item.title,
      description: item.body
        ? `${item.body.substring(0, 60)}${item.body.length > 60 ? "..." : ""}`
        : null,
      url: item.url || `/content/${item.id}`,
      isFavourite: item.is_favourite,
      createdAt: item.created_at,
    }));

    const formattedTags = tagResults.map((tag) => ({
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
