import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord, toApiContent } from "@/lib/backend/content-mapper";
import { NextResponse } from "next/server";

const CONTENT_PATHS = {
  getSharedByShareId: "content:getSharedByShareId",
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await callConvex<ConvexContentRecord | null>(
      "query",
      CONTENT_PATHS.getSharedByShareId,
      {
        shareId: (await params).id,
      }
    );

    if (!data) {
      return NextResponse.json(
        { error: "Content not found or not shared" },
        { status: 404 }
      );
    }

    return NextResponse.json(toApiContent(data));
  } catch (error) {
    console.error("Error occured while fetching data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
