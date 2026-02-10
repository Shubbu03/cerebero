import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { callConvex } from "@/lib/backend/convex-http";

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

type CreatedUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join(", ");

      return NextResponse.json(
        { error: errorMessages, message: errorMessages },
        { status: 400 }
      );
    }

    const { email, name, password } = validationResult.data;
    const hashedPassword = await hash(password, 10);

    const user = await callConvex<CreatedUser>(
      "mutation",
      "users:createCredentialsUser",
      {
        email,
        name,
        passwordHash: hashedPassword,
      }
    );

    return NextResponse.json(
      { user, message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("EMAIL_EXISTS")) {
      return NextResponse.json(
        { error: "Email already exists", message: "Email already exists" },
        { status: 409 }
      );
    }

    console.error("Error during signup:", error);

    return NextResponse.json(
      { error: "Internal server error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
