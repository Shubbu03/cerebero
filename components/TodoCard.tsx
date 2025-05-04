"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconTrash, IconEyeOff, IconEye, IconBrain } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import axios from "axios";

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
        "flex items-center justify-between bg-background/20 border border-gray-700/40 rounded-lg px-3 py-2 mb-2",
        minimalist && "bg-transparent border-none px-1 py-1"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggleComplete(todo.id)}
          className="border-gray-500"
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
          className="text-gray-400 hover:text-destructive hover:bg-destructive/10 w-7 h-7"
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

export default function TodoCard() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [minimalist, setMinimalist] = useState(false);

  useEffect(() => {
    fetchUserTodos();
  }, []);

  const fetchUserTodos = async () => {
    try {
      const response = await axios.get("/api/todos");
      if (response.data?.todo) {
        const fetchedTodos: TodoItem[] = response.data.todo;
        fetchedTodos.sort((a, b) => {
          return Number(a.completed) - Number(b.completed);
        });
        setTodos(fetchedTodos);
      }
    } catch (error) {
      console.error("Error fetching user todo:", error);
    }
  };

  const handleAdd = async () => {
    if (newTodo.trim() === "" || todos.length >= 3) return;

    try {
      await axios.post("/api/todos", {
        title: newTodo.trim(),
      });
      setNewTodo("");
      fetchUserTodos();
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete("/api/todos", {
        data: { id },
      });
      fetchUserTodos();
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      await axios.patch("/api/todos", { id });
      fetchUserTodos();
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <Card className="w-full max-w-full mx-auto bg-transparent border-none shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <IconBrain
            size={20}
            className={minimalist ? "text-gray-500" : "text-gray-200"}
          />
          <CardTitle
            className={cn(
              "text-lg font-semibold",
              minimalist ? "text-gray-500" : "text-gray-200"
            )}
          >
            Focus for Today
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimalist((m) => !m)}
            className="text-gray-400 hover:text-gray-200 w-7 h-7"
          >
            {minimalist ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          {todos.map((todo) => (
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
            {todos.length < 3 && (
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
                  className="shrink-0 bg-gray-700/60 hover:bg-gray-700/80 text-gray-200 h-9 px-3"
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}

        {!minimalist && todos.length >= 3 && (
          <p className="text-md text-gray-400 italic mt-2 text-center">
            Focus on your top 3 priorities.
          </p>
        )}
        {minimalist && todos.length === 0 && (
          <p className="text-md text-gray-500 italic mt-2 text-center">
            Add a focus item
          </p>
        )}
      </CardContent>
    </Card>
  );
}
