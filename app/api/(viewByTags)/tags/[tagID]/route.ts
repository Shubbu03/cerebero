import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { tagId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { tagId } = params;

    if (!tagId) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      console.error("error:", e);
      return NextResponse.json(
        { message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validationResult = UpdateTagSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;
    const { data: existingTag, error: fetchError } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("id", tagId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `Error fetching tag ${tagId} for update check:`,
        fetchError
      );
      return NextResponse.json(
        { error: "Database error checking tag" },
        { status: 500 }
      );
    }

    if (!existingTag) {
      return NextResponse.json(
        { error: "Tag not found or permission denied" },
        { status: 404 }
      );
    }

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from("tags")
      .update({ name })
      .eq("id", tagId)
      .eq("user_id", userId)
      .select("id, name")
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: `Tag name "${name}" already exists.` },
          { status: 409 }
        );
      }
      console.error(
        `Error updating tag ${tagId} for user ${userId}:`,
        updateError
      );
      return NextResponse.json(
        { error: "Failed to update tag." },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedData);
  } catch (error: unknown) {
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
  { params }: { params: { tagId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { tagId } = params;

    if (!tagId) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    const { data: tagToDelete, error: fetchError } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("id", tagId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `Error fetching tag ${tagId} for delete check:`,
        fetchError
      );
      return NextResponse.json(
        { error: "Database error checking tag before delete" },
        { status: 500 }
      );
    }

    if (!tagToDelete) {
      return NextResponse.json(
        { error: "Tag not found or permission denied" },
        { status: 404 }
      );
    }

    const { error: contentTagError } = await supabaseAdmin
      .from("content_tags")
      .delete()
      .eq("tag_id", tagId);

    if (contentTagError) {
      console.error(
        `Error deleting content_tags for tag ${tagId}:`,
        contentTagError
      );
      return NextResponse.json(
        { error: "Failed to remove tag associations." },
        { status: 500 }
      );
    }
    const { error: deleteTagError } = await supabaseAdmin
      .from("tags")
      .delete()
      .eq("id", tagId)
      .eq("user_id", userId);

    if (deleteTagError) {
      console.error(
        `Error deleting tag ${tagId} for user ${userId}:`,
        deleteTagError
      );
      return NextResponse.json(
        { error: "Failed to delete tag." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Tag deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
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
