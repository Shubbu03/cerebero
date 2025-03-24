import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return <AuthForm mode="login" />;
}
