import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ParamSchema = z.object({
  contentID: z.string().uuid("Invalid content ID format"),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contentID = searchParams.get("contentID");

    const validatedParams = ParamSchema.safeParse({ contentID });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { contentID: contentId } = validatedParams.data;

    const { data, error } = await supabaseAdmin
      .from("content_tags")
      .select(
        `
          tag_id,
          tags!inner (
            id,
            name
          )
        `
      )
      .eq("content_id", contentId);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch content tags" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching content tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
