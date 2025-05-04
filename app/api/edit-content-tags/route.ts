import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { z } from "zod";

const contentTagSchema = z.object({
  contentID: z.string().uuid({ message: "Invalid content ID" }),
  tagID: z.string().uuid({ message: "Invalid tag ID" }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = contentTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.format() },
        { status: 400 }
      );
    }
    const { contentID, tagID } = parsed.data;

    const { data: tag, error: tagErr } = await supabaseAdmin
      .from("tags")
      .select("user_id")
      .eq("id", tagID)
      .single();
    if (tagErr || !tag) {
      console.error("Tag lookup error:", tagErr);
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }
    if (tag.user_id !== userId) {
      return NextResponse.json(
        { message: "Forbidden: Tag does not belong to you" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("content_tags")
      .insert({ content_id: contentID, tag_id: tagID });

    if (error) {
      console.error("Error inserting content_tag:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Tag already attached to content" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: "Failed to attach tag to content" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Tag attached successfully" },
      { status: 200 }
    );
  } catch (err) {
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const parsed = contentTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.format() },
        { status: 400 }
      );
    }
    const { contentID, tagID } = parsed.data;

    const { data: tag, error: tagErr } = await supabaseAdmin
      .from("tags")
      .select("user_id")
      .eq("id", tagID)
      .single();
    if (tagErr || !tag) {
      console.error("Tag lookup error:", tagErr);
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }
    if (tag.user_id !== userId) {
      return NextResponse.json(
        { message: "Forbidden: Tag does not belong to you" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("content_tags")
      .delete()
      .eq("content_id", contentID)
      .eq("tag_id", tagID);

    if (error) {
      console.error("Error deleting content_tag:", error);
      return NextResponse.json(
        { message: "Failed to remove tag from content" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Tag removed successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
