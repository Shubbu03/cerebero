import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import { z } from "zod";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord, toApiContent } from "@/lib/backend/content-mapper";

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["document", "tweet", "youtube", "link"]),
  url: z.string().url().optional().nullable(),
  body: z.string().optional().nullable(),
});

type UpdateResult =
  | { status: "updated"; content: ConvexContentRecord }
  | { status: "not_found"; content: null };

const CONTENT_PATHS = {
  updateForUser: "content:updateForUser",
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

    const body = await request.json();
    const validationResult = contentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { title, type, url, body: contentBody } = validationResult.data;

    const result = await callConvex<UpdateResult>(
      "mutation",
      CONTENT_PATHS.updateForUser,
      {
        userId,
        contentId: contentID,
        title,
        type,
        url: url ?? undefined,
        body: contentBody ?? undefined,
      }
    );

    if (result.status === "not_found") {
      return NextResponse.json(
        { message: "Content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Content updated successfully",
        content: toApiContent(result.content),
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
