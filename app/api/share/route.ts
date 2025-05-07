import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: content, error: fetchError } = await supabaseAdmin
      .from("content")
      .select("is_shared")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const updatedIsShared = !content.is_shared;

    const { error: updateError } = await supabaseAdmin
      .from("content")
      .update({
        is_shared: updatedIsShared,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to toggle sharing" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Share status updated",
      is_shared: updatedIsShared,
    });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID parameter" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("content")
      .select("id, is_shared, share_id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const responseData = {
      id: data.id,
      is_shared: data.is_shared,
      share_id: data.is_shared ? data.share_id : null,
      share_url:
        data.is_shared && data.share_id
          ? `${process.env.SHARED_BASE_URL}/shared/${data.share_id}`
          : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
