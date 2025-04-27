import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userID = (await params).id;

    if (!userID) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("email, name, created_at")
      .eq("id", userID)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { message: "Failed to fetch user" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "User fetched successfully",
        data: data,
      },
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
