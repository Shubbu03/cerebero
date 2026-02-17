import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../auth/[...nextauth]/options";
import { ai } from "@/lib/gen-ai";
import { callConvex } from "@/lib/backend/convex-http";
import { ConvexContentRecord } from "@/lib/backend/content-mapper";

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

type TagRecord = {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

type CreateTagResult =
  | { status: "existing"; tag: TagRecord }
  | { status: "created"; tag: TagRecord };

const CONTENT_PATHS = {
  createForUser: "content:createForUser",
  upsertEmbeddingForContent: "content:upsertEmbeddingForContent",
} as const;

const TAG_PATHS = {
  createForUser: "tags:createForUser",
  attachToContent: "tags:attachToContent",
} as const;

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

    const contentData = await callConvex<ConvexContentRecord>(
      "mutation",
      CONTENT_PATHS.createForUser,
      {
        userId,
        title: validatedData.title,
        type: validatedData.type,
        url: validatedData.url || undefined,
        body: validatedData.body || undefined,
        isShared: false,
      }
    );

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
      await callConvex("mutation", CONTENT_PATHS.upsertEmbeddingForContent, {
        userId,
        contentId: contentID,
        embedding: embedding.values,
      });
    } catch (e) {
      console.error("Embedding generation error:", e);
    }

    if (validatedData.tags.length > 0) {
      const normalizedTags = Array.from(
        new Set(
          validatedData.tags
            .map((tagName) => tagName.trim().toLowerCase())
            .filter(Boolean)
        )
      );

      for (const tagName of normalizedTags) {
        try {
          const tagResult = await callConvex<CreateTagResult>(
            "mutation",
            TAG_PATHS.createForUser,
            {
              userId,
              name: tagName,
            }
          );

          await callConvex("mutation", TAG_PATHS.attachToContent, {
            userId,
            contentId: contentData.id,
            tagId: tagResult.tag.id,
          });
        } catch (tagError) {
          console.error("Tag attach error:", tagError);
        }
      }
    }

    return NextResponse.json({
      message: "Content created successfully",
      contentId: contentData.id,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
