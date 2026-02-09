import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcrypt";
import { z } from "zod";
import type { NextAuthOptions } from "next-auth";
import { callConvex } from "@/lib/backend/convex-http";

const credentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ConvexUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  passwordHash?: string | null;
};

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
        const validatedCredentials = credentialsSchema.parse(credentials);
        const email = validatedCredentials.email.trim().toLowerCase();

        const user = await callConvex<ConvexUser | null>("query", "users:getByEmail", {
          email,
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          validatedCredentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          return false;
        }

        try {
          const dbUser = await callConvex<ConvexUser>(
            "mutation",
            "users:upsertGoogleUser",
            {
              email: user.email,
              name: user.name ?? user.email,
              image: user.image ?? undefined,
              providerId: account.providerAccountId,
              provider: "google",
            }
          );

          user.id = dbUser.id;
          user.name = dbUser.name;
          user.email = dbUser.email;
          user.image = dbUser.image ?? null;
          return true;
        } catch (error) {
          console.error("Google sign-in persistence failed:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        return token;
      }

      if (!token.id && token.email) {
        try {
          const dbUser = await callConvex<ConvexUser | null>(
            "query",
            "users:getByEmail",
            {
              email: token.email,
            }
          );

          if (dbUser) {
            token.id = dbUser.id;
          }
        } catch (error) {
          console.error("Error resolving token user id:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/api/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === "development",
};
