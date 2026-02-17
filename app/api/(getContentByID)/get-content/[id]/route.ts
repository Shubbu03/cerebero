import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord, toApiContent } from "@/lib/backend/content-mapper";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const CONTENT_PATHS = {
  getByIdForUser: "content:getByIdForUser",
} as const;

export async function GET(
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
    const data = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getByIdForUser,
      {
        userId,
        contentId,
      }
    );

    if (!data) {
      return NextResponse.json(
        { message: "Content not found or does not belong to user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Content fetched successfully",
        data: toApiContent(data),
      },
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
