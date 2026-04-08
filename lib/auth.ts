import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import crypto from "crypto";
import db from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { department: true },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Single Session Enforcement: Generate new session ID
        const sessionId = crypto.randomUUID();
        
        // Update database with new session ID
        try {
          await db.user.update({
            where: { id: user.id },
            data: { currentSessionId: sessionId },
          });
        } catch (error) {
          console.error("Failed to update currentSessionId:", error);
          // If the update fails (e.g. column missing), we continue login but without single-session enforcement for now
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          departmentSlug: user.department?.slug || null,
          sessionId: sessionId,
          authVersion: user.authVersion || 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
        token.departmentSlug = user.departmentSlug;
        token.sessionId = user.sessionId;
        token.authVersion = user.authVersion;
      }

      // Periodically check if session is still valid (every time JWT is refreshed)
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: Number(token.id) },
            select: { currentSessionId: true, authVersion: true, isActive: true },
          });

          const minAuthVersionSetting = await db.systemSetting.findUnique({
            where: { key: "MIN_AUTH_VERSION" },
          });
          const minAuthVersion = minAuthVersionSetting ? parseInt(minAuthVersionSetting.value) : 0;

          if (
            !dbUser || 
            !dbUser.isActive || 
            (dbUser.currentSessionId && token.sessionId && dbUser.currentSessionId !== token.sessionId) ||
            (dbUser.authVersion !== undefined && dbUser.authVersion < minAuthVersion)
          ) {
            return null as any; // Trigger logout
          }
        } catch (error) {
          console.error("Session check error:", error);
          // In case of DB error, allow session unless strictness is required
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.departmentId = token.departmentId as number | null;
        session.user.departmentSlug = token.departmentSlug as string | null;
      }
      return session;
    },
  },
};


