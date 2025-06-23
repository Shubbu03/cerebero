"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconTrash, IconEyeOff, IconEye, IconBrain } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { notify } from "@/lib/notify";
import { useSession } from "next-auth/react";

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
        "flex items-center justify-between bg-background/20 border border-gray-700/40 rounded-lg px-3 py-2 mb-2 hover:border-gray-600/80 transition-all duration-200 ease-in-out",
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
          className="text-gray-400 hover:text-red-400 hover:bg-destructive/10 w-7 h-7 cursor-pointer"
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
    const response = await axios.get("/api/todos");
    if (response.data?.todo) {
      const fetchedTodos: TodoItem[] = response.data.todo;
      fetchedTodos.sort((a, b) => {
        return Number(a.completed) - Number(b.completed);
      });
      return fetchedTodos;
    }
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
      await axios.post("/api/todos", {
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
      await axios.delete("/api/todos", {
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
      await axios.patch("/api/todos", { id });
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
    <div className="w-full max-w-full mx-auto space-y-4 p-6">
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <IconBrain className={"h-5 w-5 text-white"} />
          <h2 className={"text-xl font-semibold text-white"}>
            Focus for Today
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimalist((m) => !m)}
            className="text-gray-400 hover:text-gray-200 w-5 h-5 cursor-pointer"
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
                  className="text-sm bg-background/20 border-gray-700/40 text-gray-200 placeholder:text-gray-500 h-9"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  onClick={handleAdd}
                  variant="secondary"
                  className="shrink-0 bg-gray-700/60 hover:bg-gray-700/80 text-gray-200 h-9 px-3 cursor-pointer"
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}

        {!minimalist && todos.data && todos.data.length >= 0 && (
          <p className="text-md text-gray-400 italic mt-2 text-center">
            Focus on your top 3 priorities.
          </p>
        )}
        {minimalist && todos.data && todos.data.length === 0 && (
          <p className="text-md text-gray-500 italic mt-2 text-center">
            Add a focus item
          </p>
        )}
      </div>
    </div>
  );
}
