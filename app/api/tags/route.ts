import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const tagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name is too long"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let userId = session.user.id;

    if (!userId && session.user.email) {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (error) {
        console.error("Error fetching user ID from Supabase:", error);
        return NextResponse.json(
          { message: "Failed to identify user" },
          { status: 500 }
        );
      }

      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      console.error(
        "User ID is missing from session and could not be retrieved"
      );
      return NextResponse.json(
        { message: "User ID not found" },
        { status: 400 }
      );
    }

    const { data: tags, error } = await supabase
      .from("tags")
      .select("id, name, user_id")
      .eq("user_id", userId)
      .order("name");

    if (error) {
      console.error("Error fetching tags:", error);
      return NextResponse.json(
        { message: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let userId = session.user.id;

    if (!userId && session.user.email) {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (error) {
        console.error("Error fetching user ID from Supabase:", error);
        return NextResponse.json(
          { message: "Failed to identify user" },
          { status: 500 }
        );
      }

      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      console.error(
        "User ID is missing from session and could not be retrieved"
      );
      return NextResponse.json(
        { message: "User ID not found" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validationResult = tagSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const tagName = validationResult.data.name.toLowerCase();

    const { data: existingTag } = await supabase
      .from("tags")
      .select("id, name, user_id")
      .eq("name", tagName)
      .eq("user_id", userId)
      .single();

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    const { data: newTag, error } = await supabase
      .from("tags")
      .insert({
        name: tagName,
        user_id: userId,
      })
      .select("id, name, user_id")
      .single();

    if (error) {
      console.error("Error creating tag:", error);
      return NextResponse.json(
        { message: "Failed to create tag" },
        { status: 500 }
      );
    }

    return NextResponse.json(newTag);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
