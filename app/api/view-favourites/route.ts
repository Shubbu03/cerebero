import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { data, error } = await supabaseAdmin
      .from("content")
      .select()
      .eq("user_id", userId)
      .eq("is_favourite", true);

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
        { status: 200 }
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
