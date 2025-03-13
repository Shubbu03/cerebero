import { supabase } from "@/lib/supabaseClient";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { data, error } = await supabase
      .from("content")
      .select()
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user data!!", error);
      return NextResponse.json(
        { message: "Failed to fetch user content" },
        { status: 500 }
      );
    }

    if (!data || data.length == 0) {
      return NextResponse.json(
        { message: "User has no content" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "User data fetched successfully",
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
