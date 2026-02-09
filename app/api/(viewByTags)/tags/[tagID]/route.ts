import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(50),
});

type TagRecord = {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

type UpdateTagResult =
  | { status: "updated"; tag: TagRecord }
  | { status: "not_found" }
  | { status: "conflict" };

type DeleteTagResult = { status: "deleted" } | { status: "not_found" };

const TAG_PATHS = {
  updateForUser: "tags:updateForUser",
  deleteForUser: "tags:deleteForUser",
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagID: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const tagId = (await params).tagID;

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    const payload = await request.json();
    const validationResult = updateTagSchema.safeParse(payload);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const result = await callConvex<UpdateTagResult>(
      "mutation",
      TAG_PATHS.updateForUser,
      {
        userId: session.user.id,
        tagId,
        name: validationResult.data.name,
      }
    );

    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Tag not found or permission denied" },
        { status: 404 }
      );
    }

    if (result.status === "conflict") {
      return NextResponse.json(
        { error: `Tag name "${validationResult.data.name}" already exists.` },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: result.tag.id,
      name: result.tag.name,
    });
  } catch (error: unknown) {
    if (isConvexValidationError(error)) {
      return NextResponse.json({ error: "Invalid tag ID" }, { status: 400 });
    }

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tagID: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const tagId = (await params).tagID;

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    const result = await callConvex<DeleteTagResult>(
      "mutation",
      TAG_PATHS.deleteForUser,
      {
        userId: session.user.id,
        tagId,
      }
    );

    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Tag not found or permission denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Tag deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (isConvexValidationError(error)) {
      return NextResponse.json({ error: "Invalid tag ID" }, { status: 400 });
    }

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
