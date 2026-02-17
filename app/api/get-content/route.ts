import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord, toApiContent } from "@/lib/backend/content-mapper";

const CONTENT_PATHS = {
  listByUser: "content:listByUser",
} as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await callConvex<ConvexContentRecord[]>(
      "query",
      CONTENT_PATHS.listByUser,
      { userId }
    );

    if (!data || data.length == 0) {
      return NextResponse.json(
        { message: "User has no content" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "User data fetched successfully",
        data: data.map(toApiContent),
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
