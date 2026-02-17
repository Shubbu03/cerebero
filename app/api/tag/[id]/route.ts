import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord } from "@/lib/backend/content-mapper";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface TagRecord {
  id: string;
  name: string;
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
}

type CreateTagResult =
  | { status: "existing"; tag: TagRecord }
  | { status: "created"; tag: TagRecord };

const CONTENT_PATHS = {
  getByIdForUser: "content:getByIdForUser",
} as const;

const TAG_PATHS = {
  createForUser: "tags:createForUser",
  listByContent: "tags:listByContent",
  attachToContent: "tags:attachToContent",
  detachFromContent: "tags:detachFromContent",
} as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const contentId = (await params).id;
    const { tags } = await request.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array of tag names" },
        { status: 400 }
      );
    }

    const content = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getByIdForUser,
      {
        userId,
        contentId,
      }
    );

    if (!content) {
      return NextResponse.json(
        { error: "Content not found or access denied" },
        { status: 404 }
      );
    }

    const currentTags = await callConvex<TagRecord[]>("query", TAG_PATHS.listByContent, {
      userId,
      contentId,
    });

    const nextTagNames = Array.from(
      new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))
    );

    const nextTagIds = new Set<string>();

    for (const tagName of nextTagNames) {
      const tagResult = await callConvex<CreateTagResult>(
        "mutation",
        TAG_PATHS.createForUser,
        {
          userId,
          name: tagName,
        }
      );

      nextTagIds.add(tagResult.tag.id);
    }

    const currentTagIds = new Set(currentTags.map((tag) => tag.id));

    for (const tagId of currentTagIds) {
      if (!nextTagIds.has(tagId)) {
        await callConvex("mutation", TAG_PATHS.detachFromContent, {
          userId,
          contentId,
          tagId,
        });
      }
    }

    for (const tagId of nextTagIds) {
      if (!currentTagIds.has(tagId)) {
        await callConvex("mutation", TAG_PATHS.attachToContent, {
          userId,
          contentId,
          tagId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tags updated successfully",
    });
  } catch (error) {
    console.error("Error updating tags:", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const contentId = (await params).id;

    const content = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getByIdForUser,
      {
        userId,
        contentId,
      }
    );

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const tags = await callConvex<TagRecord[]>("query", TAG_PATHS.listByContent, {
      userId,
      contentId,
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
