import { supabase } from "@/lib/supabaseClient";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface Tag {
  id: string;
  name: string;
}

interface ContentTag {
  tag_id: string;
  tags: Tag;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const contentId = params.id;
    const { tags } = await request.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array of tag names" },
        { status: 400 }
      );
    }

    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("id, user_id")
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { error: "Content not found or access denied" },
        { status: 404 }
      );
    }

    await supabase.rpc("begin_transaction");

    await supabase.from("content_tags").delete().eq("content_id", contentId);

    const tagIds = [];
    for (const tagName of tags) {
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .eq("name", tagName)
        .eq("user_id", userId)
        .single();

      let tagId;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from("tags")
          .insert({
            name: tagName,
            user_id: userId,
          })
          .select("id")
          .single();

        if (tagError) {
          return NextResponse.json(
            { error: `Failed to create tag: ${tagError.message}` },
            { status: 500 }
          );
        }

        tagId = newTag.id;
      }

      tagIds.push(tagId);
    }

    if (tagIds.length > 0) {
      const tagRelations = tagIds.map((tagId) => ({
        content_id: contentId,
        tag_id: tagId,
      }));

      const { error: relationError } = await supabase
        .from("content_tags")
        .insert(tagRelations);

      if (relationError) {
        return NextResponse.json(
          { error: `Failed to update tags: ${relationError.message}` },
          { status: 500 }
        );
      }
    }

    await supabase.rpc("commit_transaction");

    return NextResponse.json({
      success: true,
      message: "Tags updated successfully",
    });
  } catch (error) {
    console.error("Error updating tags:", error);
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contentId = params.id;

    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("id")
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const { data: contentTags, error: tagsError } = await supabase
      .from("content_tags")
      .select(
        `
            tag_id,
            tags (
              id,
              name
            )
          `
      )
      .eq("content_id", contentId);

    if (tagsError) {
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    const typedContentTags = contentTags as unknown as ContentTag[];

    const tags = typedContentTags.map((item) => ({
      id: item.tags.id,
      name: item.tags.name,
    }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
