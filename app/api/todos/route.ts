import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "../auth/[...nextauth]/options";

const addTodoSchema = z.object({
  title: z.string().min(1).max(280),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { data, error } = await supabaseAdmin
      .from("todos")
      .select("id, title, completed")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "Failed to fetch todos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ todo: data }, { status: 200 });
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

    const userId = session.user.id;

    const body = await request.json();

    const validationResult = addTodoSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const { data, error } = await supabaseAdmin
      .from("todos")
      .insert({
        user_id: userId,
        title: validatedData.title,
      })
      .select("id, title, completed");

    if (error) {
      return NextResponse.json(
        { message: "Failed to create todo" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Todo added successfully", todo: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();
    const validated = idSchema.parse(body);

    const { data: todoData, error: todoError } = await supabaseAdmin
      .from("todos")
      .select("id")
      .eq("id", validated.id)
      .eq("user_id", userId)
      .single();

    if (todoError || !todoData) {
      return NextResponse.json(
        {
          message: "Todo not found or does not belong to user",
        },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("todos")
      .delete()
      .eq("id", validated.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Todo deleted successfully" },
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();
    const validated = idSchema.parse(body);

    const { data: todoData, error: todoError } = await supabaseAdmin
      .from("todos")
      .select("id, completed")
      .eq("id", validated.id)
      .eq("user_id", userId)
      .single();

    if (todoError || !todoData) {
      return NextResponse.json(
        {
          message: "Todo not found or does not belong to user",
        },
        { status: 404 }
      );
    }

    const newCompletedValue = !todoData.completed;

    const { data: updatedTodo, error: updateError } = await supabaseAdmin
      .from("todos")
      .update({ completed: newCompletedValue })
      .eq("id", validated.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating todo:", updateError);
      return NextResponse.json(
        { message: "Failed to update todo status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Todo updated successfully`,
      content: updatedTodo,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
