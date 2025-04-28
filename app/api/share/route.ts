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
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: content } = await supabaseAdmin
      .from("content")
      .select("is_shared, share_id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const newIsShared = !content?.is_shared;

    const { data, error } = await supabaseAdmin
      .from("content")
      .update({
        is_shared: newIsShared,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("id, is_shared, share_id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to toggle sharing" },
        { status: 500 }
      );
    }

    const responseData = {
      ...data,
      share_url:
        data.is_shared && data.share_id
          ? `${process.env.SHARED_BASE_URL}/shared/${data.share_id}`
          : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
