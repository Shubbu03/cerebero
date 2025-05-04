import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const contentId = (await params).id;

    if (!contentId) {
      return NextResponse.json(
        { message: "Content ID is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: contentData, error: contentError } = await supabaseAdmin
      .from("content")
      .select("id")
      .eq("id", contentId)
      .eq("user_id", userId)
      .single();

    if (contentError || !contentData) {
      return NextResponse.json(
        {
          message: "Content not found or does not belong to user",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("content")
      .delete()
      .eq("id", contentId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting content:", deleteError);
      return NextResponse.json(
        { message: "Failed to delete content" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Content deleted successfully" },
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
