"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconTrash, IconEyeOff, IconEye, IconBrain } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { useSession } from "next-auth/react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

function TodoItemComponent({
  todo,
  onDelete,
  onToggleComplete,
  minimalist,
}: {
  todo: TodoItem;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  minimalist: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between rounded-lg border border-border/70 bg-card px-3 py-2 transition",
        minimalist && "bg-transparent border-none px-1 py-1"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggleComplete(todo.id)}
          className="border-gray-500 cursor-pointer"
          id={todo.id}
        />
        <label
          htmlFor={`todo-${todo.id}`}
          className={cn(
            "text-sm cursor-pointer",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          {todo.title}
        </label>
      </div>

      {!minimalist && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 cursor-pointer text-muted-foreground hover:bg-accent hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo.id);
          }}
        >
          <IconTrash size={16} />
        </Button>
      )}
    </div>
  );
}

const fetchUserTodos = async () => {
  try {
    const response = await apiGet<{ todo: TodoItem[] }>("/api/todos");
    if (response.todo) {
      const fetchedTodos = response.todo;
      fetchedTodos.sort((a, b) => {
        return Number(a.completed) - Number(b.completed);
      });
      return fetchedTodos;
    }
    return [];
  } catch (error) {
    notify("Error fetching user todo:", "error");
    throw error;
  }
};

export default function TodoCard() {
  const [newTodo, setNewTodo] = useState("");
  const [minimalist, setMinimalist] = useState(false);
  const session = useSession();
  const userID = session.data?.user.id;

  const todos = useSuspenseQuery({
    queryKey: ["todos", userID],
    queryFn: fetchUserTodos,
  });
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (newTodo.trim() === "" || !todos.data || todos.data.length >= 3) return;

    try {
      await apiPost("/api/todos", {
        title: newTodo.trim(),
      });
      setNewTodo("");
      await queryClient.invalidateQueries({
        queryKey: ["todos", userID],
      });
      notify("Todo added successfully", "success");
    } catch (error) {
      notify("Error adding todo", "error");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete("/api/todos", {
        data: { id },
      });
      await queryClient.invalidateQueries({
        queryKey: ["todos", userID],
      });
      notify("Todo deleted successfully", "success");
    } catch (error) {
      notify("Error deleting todo", "error");
      throw error;
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      await apiPatch("/api/todos", { id });
      await queryClient.invalidateQueries({
        queryKey: ["todos", userID],
      });
    } catch (error) {
      notify("Error toggling todo", "error");
      throw error;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <section className="surface-soft w-full space-y-4 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-row items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <IconBrain className={"h-5 w-5 text-primary"} />
          <h2 className={"text-fluid-lg font-semibold"}>Focus for Today</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimalist((m) => !m)}
            className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {minimalist ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </Button>
        </div>
      </div>

      <div className="pt-0">
        <div className="space-y-2 mb-4">
          {todos.data &&
            todos.data.map((todo) => (
              <TodoItemComponent
                key={todo.id}
                todo={todo}
                onDelete={handleDelete}
                onToggleComplete={toggleComplete}
                minimalist={minimalist}
              />
            ))}
        </div>

        {!minimalist && (
          <div className="flex items-center gap-2 mt-1">
            {todos.data && todos.data.length < 3 && (
              <>
                <Input
                  placeholder="Add a focus item..."
                  className="h-10 text-sm"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  onClick={handleAdd}
                  variant="secondary"
                  className="h-10 shrink-0 cursor-pointer px-3"
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}

        {!minimalist && todos.data && todos.data.length >= 0 && (
          <p className="mt-2 text-center text-sm italic text-muted-foreground">
            Focus on your top 3 priorities.
          </p>
        )}
        {minimalist && todos.data && todos.data.length === 0 && (
          <p className="mt-2 text-center text-sm italic text-muted-foreground">
            Add a focus item
          </p>
        )}
      </div>
    </section>
  );
}
