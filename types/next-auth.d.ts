import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      departmentId: number | null;
      departmentSlug: string | null;
      sessionId?: string;
      authVersion?: number;
      passwordSetupRequired?: boolean;
      firstLoginAt?: Date | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    departmentId: number | null;
    departmentSlug: string | null;
    sessionId?: string;
    authVersion?: number;
    firstLoginAt?: Date | null;
    passwordSetupRequired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    departmentId: number | null;
    departmentSlug: string | null;
    sessionId?: string;
    authVersion?: number;
    firstLoginAt?: Date | null;
    passwordSetupRequired?: boolean;
  }
}

