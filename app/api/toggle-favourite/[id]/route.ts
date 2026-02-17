import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord, toApiContent } from "@/lib/backend/content-mapper";

const CONTENT_PATHS = {
  toggleFavouriteForUser: "content:toggleFavouriteForUser",
} as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentID = (await params).id;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const updatedContent = await callConvex<ConvexContentRecord | null>(
      "mutation",
      CONTENT_PATHS.toggleFavouriteForUser,
      {
        userId,
        contentId: contentID,
      }
    );

    if (!updatedContent) {
      return NextResponse.json(
        { message: "Content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Added to favourite successfully`,
      content: toApiContent(updatedContent),
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
