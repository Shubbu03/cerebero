import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authOptions } from "../auth/[...nextauth]/options";
import { ai } from "@/lib/gen-ai";

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
    const session = await getServerSession(authOptions);

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

    const { data: contentData, error: contentError } = await supabaseAdmin
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

    //content embeddings
    const contentID = contentData.id;

    try {
      let inputText = validatedData.title;

      if (validatedData.type === "document" && validatedData.body) {
        inputText += `\n${validatedData.body}`;
      } else if (
        (validatedData.type === "tweet" ||
          validatedData.type === "youtube" ||
          validatedData.type === "link") &&
        validatedData.url
      ) {
        inputText += `\n${validatedData.url}`;
        if (validatedData.body) inputText += `\n${validatedData.body}`;
      }

      const embedResp = await ai.models.embedContent({
        model: "gemini-embedding-exp-03-07",
        contents: inputText,
        config: { taskType: "RETRIEVAL_DOCUMENT" },
      });

      if (!embedResp.embeddings || embedResp.embeddings.length === 0) {
        throw new Error("No embeddings generated");
      }

      const embedding = embedResp.embeddings[0];

      await supabaseAdmin.from("content_embeddings").insert({
        content_id: contentID,
        embedding,
      });
    } catch (e) {
      console.error("Embedding generation error:", e);
    }

    if (validatedData.tags.length > 0) {
      for (const tagName of validatedData.tags) {
        const { data: existingTag } = await supabaseAdmin
          .from("tags")
          .select("id")
          .eq("name", tagName.toLowerCase())
          .eq("user_id", userId)
          .single();

        let tagId;

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabaseAdmin
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

        await supabaseAdmin.from("content_tags").insert({
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
