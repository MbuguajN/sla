import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import crypto from "crypto";
import db from "./db";

const LOGIN_ATTEMPT_RETENTION_HOURS = 48;
const LOGIN_RATE_LIMIT_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILED_ATTEMPTS_PER_EMAIL = 5;
const LOGIN_MAX_FAILED_ATTEMPTS_PER_IP = 20;

type AuthRequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>;
};

function readHeader(
  headers: AuthRequestLike["headers"],
  name: string
): string | null {
  if (!headers) return null;

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getRequestIp(req?: AuthRequestLike) {
  const forwardedFor = readHeader(req?.headers, "x-forwarded-for");
  if (forwardedFor) {
    const candidates = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/^\[(.*)\](:\d+)?$/, "$1"))
      .map((part) => part.replace(/:\d+$/, ""));

    if (candidates.length > 0) {
      return candidates[candidates.length - 1] ?? null;
    }
  }

  const realIp = readHeader(req?.headers, "x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

async function getRecentFailedLoginAttempts(params: { email: string; ipAddress: string | null }) {
  const cutoff = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const [emailFailures, ipFailures] = await Promise.all([
    db.loginAttempt.count({
      where: {
        email: params.email,
        status: "FAILED",
        createdAt: { gte: cutoff },
      },
    }),
    params.ipAddress
      ? db.loginAttempt.count({
          where: {
            ipAddress: params.ipAddress,
            status: "FAILED",
            createdAt: { gte: cutoff },
          },
        })
      : Promise.resolve(0),
  ]);

  return { emailFailures, ipFailures };
}

async function assertLoginNotRateLimited(email: string, req?: AuthRequestLike) {
  const ipAddress = getRequestIp(req);
  const { emailFailures, ipFailures } = await getRecentFailedLoginAttempts({
    email,
    ipAddress,
  });

  if (emailFailures >= LOGIN_MAX_FAILED_ATTEMPTS_PER_EMAIL || ipFailures >= LOGIN_MAX_FAILED_ATTEMPTS_PER_IP) {
    throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
  }
}

function getUserAgent(req?: AuthRequestLike) {
  return readHeader(req?.headers, "user-agent");
}

function isPrivateIp(ip: string) {
  const normalizedIp = ip.replace(/^::ffff:/, "").trim().toLowerCase();

  return (
    normalizedIp === "::1" ||
    normalizedIp === "localhost" ||
    normalizedIp.startsWith("10.") ||
    normalizedIp.startsWith("127.") ||
    normalizedIp.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedIp)
  );
}

async function resolveLoginLocation(ipAddress: string | null) {
  if (!ipAddress) return null;
  if (isPrivateIp(ipAddress)) return "Private network";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ipAddress)}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
    };

    if (data.success === false) {
      return null;
    }

    const parts = [data.city, data.region, data.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function createLoginAttemptLog(params: {
  email: string;
  status: "SUCCESS" | "FAILED";
  userId?: number | null;
  req?: AuthRequestLike;
  failureReason?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const ipAddress = getRequestIp(params.req);
  const userAgent = getUserAgent(params.req);
  const location = await resolveLoginLocation(ipAddress);
  const retentionCutoff = new Date(
    Date.now() - LOGIN_ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000
  );

  try {
    await db.$transaction([
      db.loginAttempt.create({
        data: {
          email,
          userId: params.userId ?? null,
          status: params.status,
          ipAddress,
          location,
          userAgent,
          failureReason: params.failureReason ?? null,
        },
      }),
      db.loginAttempt.deleteMany({
        where: {
          createdAt: {
            lt: retentionCutoff,
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("Failed to create login attempt log:", error);
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const normalizedEmail = credentials.email.toLowerCase();

        await assertLoginNotRateLimited(normalizedEmail, req);

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
          include: { department: true },
        });

        if (!user) {
          await createLoginAttemptLog({
            email: normalizedEmail,
            status: "FAILED",
            req,
            failureReason: "Account not found",
          });
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          await createLoginAttemptLog({
            email: normalizedEmail,
            userId: user.id,
            status: "FAILED",
            req,
            failureReason: "Account deactivated",
          });
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          await createLoginAttemptLog({
            email: normalizedEmail,
            userId: user.id,
            status: "FAILED",
            req,
            failureReason: "Invalid password",
          });
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

        await createLoginAttemptLog({
          email: normalizedEmail,
          userId: user.id,
          status: "SUCCESS",
          req,
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          departmentSlug: user.department?.slug || null,
          sessionId: sessionId,
          authVersion: user.authVersion || 0,
          firstLoginAt: user.firstLoginAt,
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
        token.firstLoginAt = user.firstLoginAt;
      }

      // Periodically check if session is still valid (every time JWT is refreshed)
      if (token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: Number(token.id) },
            include: {
              department: { select: { id: true, slug: true } },
            },
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

          // Keep authorization claims current for middleware route checks.
          token.role = dbUser.role;
          token.departmentId = dbUser.departmentId;
          token.departmentSlug = dbUser.department?.slug || null;
          token.authVersion = dbUser.authVersion;
          token.firstLoginAt = dbUser.firstLoginAt;
          token.firstLoginAt = dbUser.firstLoginAt;
          token.firstLoginAt = dbUser.firstLoginAt;
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


