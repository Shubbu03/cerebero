import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord } from "@/lib/backend/content-mapper";

const CONTENT_PATHS = {
  getShareStatusForUser: "content:getShareStatusForUser",
  toggleShareForUser: "content:toggleShareForUser",
} as const;

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const content = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getShareStatusForUser,
      {
        userId: session.user.id,
        contentId: id,
      }
    );

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const updated = await callConvex<ConvexContentRecord | null>(
      "mutation",
      CONTENT_PATHS.toggleShareForUser,
      {
        userId: session.user.id,
        contentId: id,
      }
    );

    if (!updated) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Share status updated",
      is_shared: updated.isShared,
    });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getShareStatusForUser,
      {
        userId: session.user.id,
        contentId: id,
      }
    );

    if (!data) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const responseData = {
      id: data.id,
      is_shared: data.isShared,
      share_id: data.isShared ? data.shareId : null,
      share_url:
        data.isShared && data.shareId
          ? `${process.env.NEXT_PUBLIC_SHARED_BASE_URL}/shared/${data.shareId}`
          : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
