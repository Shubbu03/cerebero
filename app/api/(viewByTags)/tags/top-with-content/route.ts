import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface ContentItemsData {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface TagWithContent {
  tagId: string;
  tagName: string;
  usageCount: number;
  content: ContentItemsData[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.warn("Unauthorized attempt to fetch top tags content");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const contentLimitParam = searchParams.get("contentLimit");
    const tagLimitParam = searchParams.get("tagLimit");

    const contentLimit = parseInt(contentLimitParam || "5", 10);
    const tagLimit = parseInt(tagLimitParam || "5", 10);

    if (
      isNaN(contentLimit) ||
      contentLimit < 1 ||
      !Number.isInteger(contentLimit) ||
      isNaN(tagLimit) ||
      tagLimit < 1 ||
      !Number.isInteger(tagLimit)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid limit parameters. 'contentLimit' and 'tagLimit' must be positive integers.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "get_top_tags_with_content",
      {
        p_user_id: userId,
        p_tag_limit: tagLimit,
        p_content_limit: contentLimit,
      }
    );

    if (error) {
      console.error(
        `Error calling RPC get_top_tags_with_content for user ${userId}:`,
        error
      );
      return NextResponse.json(
        { error: "Failed to fetch top tags content from database." },
        { status: 500 }
      );
    }

    const typedData: TagWithContent[] = (data || []).map(
      (tag: TagWithContent) => ({
        tagId: tag.tagId,
        tagName: tag.tagName,
        usageCount: Number(tag.usageCount || 0),
        content: tag.content || [],
      })
    );

    return NextResponse.json({
      topTags: typedData,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
