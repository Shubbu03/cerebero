import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "../auth/[...nextauth]/options";
import { callConvex } from "@/lib/backend/convex-http";

const addTodoSchema = z.object({
  title: z.string().trim().min(1).max(280),
});

const idSchema = z.object({
  id: z.string().min(1, "Todo ID is required"),
});

type TodoRecord = {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
};

const CONVEX_TODOS = {
  listByUser: "todos:listByUser",
  createForUser: "todos:createForUser",
  deleteForUser: "todos:deleteForUser",
  toggleForUser: "todos:toggleForUser",
} as const;

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const todos = await callConvex<TodoRecord[]>("query", CONVEX_TODOS.listByUser, {
      userId: session.user.id,
    });

    return NextResponse.json({ todo: todos }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error while fetching todos:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const validationResult = addTodoSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validationResult.error.format() },
        { status: 400 }
      );
    }

    const createdTodo = await callConvex<TodoRecord>(
      "mutation",
      CONVEX_TODOS.createForUser,
      {
        userId: session.user.id,
        title: validationResult.data.title,
      }
    );

    return NextResponse.json(
      { message: "Todo added successfully", todo: [createdTodo] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error while creating todo:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const validated = idSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validated.error.format() },
        { status: 400 }
      );
    }

    const result = await callConvex<{ deleted: boolean }>(
      "mutation",
      CONVEX_TODOS.deleteForUser,
      {
        userId: session.user.id,
        todoId: validated.data.id,
      }
    );

    if (!result.deleted) {
      return NextResponse.json(
        { message: "Todo not found or does not belong to user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Todo deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error while deleting todo:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json();
    const validated = idSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validated.error.format() },
        { status: 400 }
      );
    }

    const updatedTodo = await callConvex<TodoRecord | null>(
      "mutation",
      CONVEX_TODOS.toggleForUser,
      {
        userId: session.user.id,
        todoId: validated.data.id,
      }
    );

    if (!updatedTodo) {
      return NextResponse.json(
        { message: "Todo not found or does not belong to user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Todo updated successfully",
      content: updatedTodo,
    });
  } catch (error) {
    console.error("Unexpected error while updating todo:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
