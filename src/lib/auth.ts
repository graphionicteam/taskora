import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        if (!process.env.DATABASE_URL) {
          // In environments without live database credentials, return safe error
          console.warn("Auth attempted without DATABASE_URL configured.");
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.passwordHash) {
            // Fake hash compare to minimize timing enumeration
            await bcrypt.compare(
              password,
              "$2a$12$e8Y6l1k9qM19nB90/e0K1.e0K1e0K1e0K1e0K1e0K1e0K1e0K1e0K"
            );
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          // Return user object strictly excluding passwordHash
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
          };
        } catch (error) {
          console.error("Database error during authorization:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days rolling
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || "development-temporary-secret-for-taskora-app-32chars",
});
