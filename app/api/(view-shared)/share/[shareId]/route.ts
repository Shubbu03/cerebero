import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    const { data, error } = await supabase
      .from("content")
      .select("id, title, type, url, body, created_at")
      .eq("share_id", params.shareId)
      .eq("is_shared", true)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Content not found or not shared" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error occured while fetching data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
