import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface ContentItemsData {
  id: string;
  title: string;
  url: string | null;
  created_at: string;
  updated_at: string;
}

interface TagWithContent {
  tagId: string;
  tagName: string;
  usageCount: number;
  content: ContentItemsData[];
}

const TAG_PATHS = {
  getTopWithContent: "tags:getTopWithContent",
} as const;

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
      Number.isNaN(contentLimit) ||
      contentLimit < 1 ||
      !Number.isInteger(contentLimit) ||
      Number.isNaN(tagLimit) ||
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

    const topTags = await callConvex<TagWithContent[]>(
      "query",
      TAG_PATHS.getTopWithContent,
      {
        userId,
        tagLimit: Math.min(tagLimit, 20),
        contentLimit: Math.min(contentLimit, 20),
      }
    );

    return NextResponse.json({ topTags });
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
