import { callConvex } from "@/lib/backend/convex-http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { z } from "zod";

const contentTagSchema = z.object({
  contentID: z.string().trim().min(1, { message: "Invalid content ID" }),
  tagID: z.string().trim().min(1, { message: "Invalid tag ID" }),
});

type AttachResult =
  | { status: "attached" }
  | { status: "exists" }
  | { status: "tag_not_found" }
  | { status: "forbidden" };

type DetachResult =
  | { status: "detached" }
  | { status: "missing" }
  | { status: "tag_not_found" }
  | { status: "forbidden" };

const TAG_PATHS = {
  attachToContent: "tags:attachToContent",
  detachFromContent: "tags:detachFromContent",
} as const;

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function isConvexValidationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("ArgumentValidationError") ||
    error.message.includes("Value does not match validator")
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const parsed = contentTagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { contentID, tagID } = parsed.data;

    const result = await callConvex<AttachResult>(
      "mutation",
      TAG_PATHS.attachToContent,
      {
        userId: session.user.id,
        contentId: contentID,
        tagId: tagID,
      }
    );

    if (result.status === "tag_not_found") {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    if (result.status === "forbidden") {
      return NextResponse.json(
        { message: "Forbidden: Tag does not belong to you" },
        { status: 403 }
      );
    }

    if (result.status === "exists") {
      return NextResponse.json(
        { message: "Tag already attached to content" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Tag attached successfully" },
      { status: 200 }
    );
  } catch (err) {
    if (isConvexValidationError(err)) {
      return NextResponse.json(
        { message: "Validation failed", errors: { tagID: ["Invalid tag ID"] } },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const parsed = contentTagSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { contentID, tagID } = parsed.data;

    const result = await callConvex<DetachResult>(
      "mutation",
      TAG_PATHS.detachFromContent,
      {
        userId: session.user.id,
        contentId: contentID,
        tagId: tagID,
      }
    );

    if (result.status === "tag_not_found") {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    if (result.status === "forbidden") {
      return NextResponse.json(
        { message: "Forbidden: Tag does not belong to you" },
        { status: 403 }
      );
    }

    if (result.status === "missing") {
      return NextResponse.json(
        { message: "Tag relation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Tag removed successfully" },
      { status: 200 }
    );
  } catch (err) {
    if (isConvexValidationError(err)) {
      return NextResponse.json(
        { message: "Validation failed", errors: { tagID: ["Invalid tag ID"] } },
        { status: 400 }
      );
    }

    console.error("Unexpected error:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
