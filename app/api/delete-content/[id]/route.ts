import { callConvex } from "@/lib/backend/convex-http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";

const CONTENT_PATHS = {
  deleteForUser: "content:deleteForUser",
} as const;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentId = (await params).id;

    if (!contentId) {
      return NextResponse.json(
        { message: "Content ID is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const result = await callConvex<{ deleted: boolean }>(
      "mutation",
      CONTENT_PATHS.deleteForUser,
      {
        userId,
        contentId,
      }
    );

    if (!result.deleted) {
      return NextResponse.json(
        {
          message: "Content not found or does not belong to user",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Content deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
