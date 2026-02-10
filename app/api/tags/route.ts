import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";

const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(50, "Tag name is too long"),
});

type TagRecord = {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

type CreateTagResult =
  | { status: "existing"; tag: TagRecord }
  | { status: "created"; tag: TagRecord };

const TAG_PATHS = {
  listByUser: "tags:listByUser",
  createForUser: "tags:createForUser",
} as const;

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function toApiTag(tag: TagRecord) {
  return {
    id: tag.id,
    name: tag.name,
    user_id: tag.userId,
    created_at: new Date(tag.createdAt).toISOString(),
    updated_at: new Date(tag.updatedAt).toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const tags = await callConvex<TagRecord[]>("query", TAG_PATHS.listByUser, {
      userId: session.user.id,
    });

    return NextResponse.json(tags.map(toApiTag));
  } catch (error) {
    console.error("Unexpected error while fetching tags:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const validationResult = tagSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.format() },
        { status: 400 }
      );
    }

    const result = await callConvex<CreateTagResult>(
      "mutation",
      TAG_PATHS.createForUser,
      {
        userId: session.user.id,
        name: validationResult.data.name,
      }
    );

    return NextResponse.json(toApiTag(result.tag));
  } catch (error) {
    console.error("Unexpected error while creating tag:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
