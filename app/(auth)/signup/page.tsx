import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";

export default async function SignUp() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm mode="signup" />
    </div>
  );
}
