import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { z } from "zod";
import Google from "next-auth/providers/google";
import { supabase } from "@/lib/supabaseClient";

const credentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const handler = NextAuth({
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

          const { data: user, error } = await supabase
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
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (!existingUser) {
          const { error } = await supabase.from("users").insert([
            {
              email: user.email,
              name: user.name,
              password: "",
              provider: "google",
              provider_id: account.providerAccountId,
            },
          ]);
          if (error) {
            console.error("Error saving Google user to Supabase:", error);
            return false;
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
