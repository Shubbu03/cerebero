import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must include uppercase, lowercase, number and special character"
    ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join(", ");

      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { email, name, password } = validationResult.data;

    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const { data: user, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          name,
          password: hashedPassword,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id, email, name, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { user, message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
