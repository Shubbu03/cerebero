// Create a new file to centralize auth configuration
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { supabase } from "./supabaseClient";

// Helper function to get the user ID from session or database
export async function getUserId() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  // If we have the ID in the session, return it
  if (session.user.id) {
    return session.user.id;
  }

  // If we don't have the ID but have the email, try to fetch from Supabase
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
