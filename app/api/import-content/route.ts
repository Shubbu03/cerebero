import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";

interface ContentItem {
  type: "document" | "tweet" | "youtube" | "link";
  title: string;
  url?: string;
  body?: string;
}

const CONTENT_PATHS = {
  importForUser: "content:importForUser",
} as const;

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
        type: item.type,
        title: item.title.trim(),
        url: item.url?.trim() || undefined,
        body: item.body || undefined,
      };
    });

    const invalidType = validatedContent.some(
      (item) =>
        item.type !== "document" &&
        item.type !== "tweet" &&
        item.type !== "youtube" &&
        item.type !== "link"
    );

    if (invalidType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid content type. Allowed values: document, tweet, youtube, link.",
        },
        { status: 400 }
      );
    }

    await callConvex<{ count: number }>("mutation", CONTENT_PATHS.importForUser, {
      userId,
      items: validatedContent,
    });

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
