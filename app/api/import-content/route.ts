import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ContentItem {
  type: string;
  title: string;
  url?: string;
  body?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const body = await request.json();
    const { content } = body;

    if (!content || !Array.isArray(content) || content.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid content data" },
        { status: 400 }
      );
    }

    const validatedContent = content.map((item: ContentItem) => {
      if (!item.type || !item.title) {
        throw new Error("Each content item must have type and title");
      }

      return {
        user_id: userId,
        type: item.type,
        title: item.title,
        url: item.url || null,
        body: item.body || null,
        is_shared: false,
        is_favourite: false,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabaseAdmin
      .from("content")
      .insert(validatedContent);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to import content",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${validatedContent.length} items`,
      count: validatedContent.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
