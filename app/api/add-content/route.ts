import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

const baseContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["document", "tweet", "youtube", "link"], {
    errorMap: () => ({ message: "Invalid content type" }),
  }),
  tags: z.array(z.string()).optional().default([]),
});

const documentSchema = baseContentSchema.extend({
  type: z.literal("document"),
  body: z.string().min(1, "Content body is required"),
  url: z.string().optional(),
});

const externalContentSchema = baseContentSchema.extend({
  url: z.string().url("Valid URL is required"),
  body: z.string().optional(),
});

const contentSchema = z.discriminatedUnion("type", [
  documentSchema,
  externalContentSchema.extend({ type: z.literal("tweet") }),
  externalContentSchema.extend({ type: z.literal("youtube") }),
  externalContentSchema.extend({ type: z.literal("link") }),
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();

    const validationResult = contentSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const { data: contentData, error: contentError } = await supabase
      .from("content")
      .insert({
        user_id: userId,
        title: validatedData.title,
        type: validatedData.type,
        url: validatedData.url || null,
        body: validatedData.body || null,
        is_shared: false,
        updated_at: new Date().toISOString(),
      })
      .select("id, share_id")
      .single();

    if (contentError) {
      console.error("Content insertion error:", contentError);
      return NextResponse.json(
        { message: "Failed to create content" },
        { status: 500 }
      );
    }

    if (validatedData.tags.length > 0) {
      for (const tagName of validatedData.tags) {
        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("name", tagName.toLowerCase())
          .eq("user_id", userId)
          .single();

        let tagId;

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from("tags")
            .insert({
              name: tagName.toLowerCase(),
              user_id: userId,
            })
            .select("id")
            .single();

          if (tagError) {
            console.error("Tag creation error:", tagError);
            continue;
          }

          tagId = newTag.id;
        }

        await supabase.from("content_tags").insert({
          content_id: contentData.id,
          tag_id: tagId,
        });
      }
    }

    return NextResponse.json({
      message: "Content created successfully",
      contentId: contentData.id,
      shareId: contentData.share_id,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
