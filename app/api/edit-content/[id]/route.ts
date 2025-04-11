import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Type is required"),
  url: z.string().url().optional().nullable(),
  body: z.string().optional().nullable(),
});

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

    const { data: existingContent, error: fetchError } = await supabaseAdmin
      .from("content")
      .select("*")
      .eq("id", contentID)
      .single();

    if (fetchError || !existingContent) {
      return NextResponse.json(
        { message: "Content not found" },
        { status: 404 }
      );
    }

    if (existingContent.user_id !== userId) {
      return NextResponse.json(
        { message: "You are not authorized to update this content" },
        { status: 403 }
      );
    }

    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from("content")
      .update({
        title,
        type,
        url,
        body: contentBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contentID)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating content:", updateError);
      return NextResponse.json(
        { message: "Failed to update content" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Content updated successfully",
      content: updatedContent,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
