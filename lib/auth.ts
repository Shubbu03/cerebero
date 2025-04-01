import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { supabase } from "./supabaseClient";

export async function getUserId() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  if (session.user.id) {
    return session.user.id;
  }

  if (session.user.email) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .single();

      if (!error && user) {
        return user.id;
      }
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  }

  return null;
}
