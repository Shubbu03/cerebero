import { supabase } from "@/lib/supabaseClient";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface ContentItemsData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ContentItems {
  content: ContentItemsData;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tagName: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const tagName = params.tagName;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: "Invalid limit or offset parameters" },
        { status: 400 }
      );
    }

    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("name", tagName)
      .eq("user_id", userId)
      .single();

    if (tagError || !tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const {
      data: contentItems,
      error: contentError,
      count,
    } = await supabase
      .from("content_tags")
      .select(
        `
        content_id,
        content (
          id,
          title,
          created_at,
          updated_at
        )
      `,
        { count: "exact" }
      )
      .eq("tag_id", tag.id)
      .range(offset, offset + limit - 1);

    if (contentError) {
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    const typeCorrectContent = contentItems as unknown as ContentItems[];
    const formattedContent = typeCorrectContent.map((item) => ({
      id: item.content.id,
      title: item.content.title,
      created_at: item.content.created_at,
      updated_at: item.content.updated_at,
    }));

    return NextResponse.json({
      content: formattedContent,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < (count ?? 0),
      },
    });
  } catch (error) {
    console.error("Error fetching content by tag:", error);
    return NextResponse.json(
      { error: "Failed to fetch content by tag" },
      { status: 500 }
    );
  }
}
