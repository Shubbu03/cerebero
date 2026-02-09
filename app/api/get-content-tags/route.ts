import { callConvex } from "@/lib/backend/convex-http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "../auth/[...nextauth]/options";

const paramSchema = z.object({
  contentID: z.string().trim().min(1, "Invalid content ID format"),
});

type ContentTag = {
  id: string;
  name: string;
};

const TAG_PATHS = {
  listByContent: "tags:listByContent",
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const contentID = searchParams.get("contentID");

    const validatedParams = paramSchema.safeParse({ contentID });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const tags = await callConvex<ContentTag[]>("query", TAG_PATHS.listByContent, {
      userId: session.user.id,
      contentId: validatedParams.data.contentID,
    });

    return NextResponse.json({ data: tags }, { status: 200 });
  } catch (error) {
    console.error("Error fetching content tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
