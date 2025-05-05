import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return <AuthForm mode="login" />;
}
