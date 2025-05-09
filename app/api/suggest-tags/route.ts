import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "../auth/[...nextauth]/options";
import { ai } from "@/lib/gen-ai";

const titleSchema = z.object({
  title: z.string().nonempty(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get("title");

    if (!title) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    const validation = titleSchema.safeParse({ title });

    if (!validation.success) {
      return NextResponse.json({ message: "Invalid title" }, { status: 400 });
    }

    const prompt = `Given the title below, suggest 2 to 3 relevant tags. Each tag should be a single lowercase word using only alphabetic characters (no numbers or special characters). Return only the tag names as a comma-separated list with no additional text. Title: "${title}"`

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: prompt }],
    });

    const tagText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const suggestedTags = tagText
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);

    return NextResponse.json({ suggestedTags }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
