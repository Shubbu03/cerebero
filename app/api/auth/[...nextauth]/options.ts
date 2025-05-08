import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { z } from "zod";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { NextAuthOptions } from "next-auth";

const credentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const validatedCredentials = credentialsSchema.parse(credentials);

          const { data: user, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", validatedCredentials.email)
            .single();

          if (error || !user) {
            throw new Error("Email not found");
          }

          const isPasswordValid = await compare(
            validatedCredentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = error.errors
              .map((err) => err.message)
              .join(", ");
            throw new Error(errorMessage);
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { data: existingUser, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", user.email)
            .single();

          if (findError && findError.code !== "PGRST116") {
            console.error("Error checking for existing user:", findError);
            return false;
          }

          if (existingUser) {
            user.id = existingUser.id;
            const { error: updateError } = await supabaseAdmin
              .from("users")
              .update({
                provider: "google",
                provider_id: account.providerAccountId,
              })
              .eq("id", existingUser.id);

            if (updateError) {
              console.error("Error updating user provider:", updateError);
            }

            return true;
          } else {
            const { data: newUser, error: insertError } = await supabaseAdmin
              .from("users")
              .insert({
                email: user.email,
                name: user.name,
                password: "",
                provider: "google",
                provider_id: account.providerAccountId,
              })
              .select()
              .single();

            if (insertError) {
              console.error(
                "Error saving Google user to Supabase:",
                insertError
              );
              return false;
            }

            if (!newUser) {
              console.error("No user returned after insert");
              return false;
            }

            user.id = newUser.id;
            return true;
          }
        } catch (error) {
          console.error("Unexpected error during Google sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      } else if (!token.id && token.email) {
        try {
          const { data: dbUser, error } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", token.email)
            .single();

          if (dbUser && !error) {
            token.id = dbUser.id;
          }
        } catch (error) {
          console.error("Error fetching user ID:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === "development",
};
