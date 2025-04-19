import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("content")
      .select("id,user_id, title, type, url, body, created_at, updated_at, is_shared")
      .eq("share_id", (await params).id)
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
