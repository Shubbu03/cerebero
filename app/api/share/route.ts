import { supabase } from "@/lib/supabaseClient";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: content } = await supabase
      .from("content")
      .select("is_shared")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    const newIsShared = !content?.is_shared;

    const { data, error } = await supabase
      .from("content")
      .update({
        is_shared: newIsShared,
        share_id: newIsShared ? crypto.randomUUID() : null,
      })
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select("id, is_shared, share_id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to toggle sharing" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
