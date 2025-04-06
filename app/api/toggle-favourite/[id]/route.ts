import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET({ params }: { params: Promise<{ id: string }> }) {
  try {
    const contentID = (await params).id;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { data: content, error: fetchError } = await supabaseAdmin
      .from("content")
      .select("is_favourite, user_id")
      .eq("id", contentID)
      .single();

    if (fetchError) {
      console.error("Error fetching content:", fetchError);
      return NextResponse.json(
        { message: "Failed to fetch content item" },
        { status: 500 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { message: "Content not found" },
        { status: 404 }
      );
    }

    if (content.user_id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized - you can only modify your own content" },
        { status: 403 }
      );
    }

    const newFavouriteValue = !content.is_favourite;

    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from("content")
      .update({ is_favourite: newFavouriteValue })
      .eq("id", contentID)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating content:", updateError);
      return NextResponse.json(
        { message: "Failed to update favourite status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Added to favourite successfully`,
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
