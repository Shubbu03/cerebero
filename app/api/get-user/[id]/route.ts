import { callConvex } from "@/lib/backend/convex-http";
import { NextRequest, NextResponse } from "next/server";

type PublicUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  provider: "credentials" | "google";
  providerId: string | null;
  createdAt: number;
  updatedAt: number;
};

const USER_PATHS = {
  getPublicById: "users:getPublicById",
} as const;

function isConvexValidationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("ArgumentValidationError") ||
    error.message.includes("Value does not match validator")
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userID = (await params).id;

    if (!userID) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }
    const data = await callConvex<PublicUser | null>(
      "query",
      USER_PATHS.getPublicById,
      {
        userId: userID,
      }
    );

    if (!data) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "User fetched successfully",
        data: {
          email: data.email,
          name: data.name,
          created_at: new Date(data.createdAt).toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (isConvexValidationError(error)) {
      return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
    }

    console.error("Unexpected error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
