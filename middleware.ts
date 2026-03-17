import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // HR routes - only HR department, Admin, or CEO
    if (path.startsWith("/hr")) {
      const canAccess =
        token?.role === "ADMIN" ||
        token?.role === "CEO" ||
        token?.departmentSlug === "human-resources";
      if (!canAccess) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Finance routes - only Finance department, Admin, or CEO
    if (path.startsWith("/finance")) {
      const canAccess =
        token?.role === "ADMIN" ||
        token?.role === "CEO" ||
        token?.departmentSlug === "finance";
      if (!canAccess) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/clients/:path*",
    "/projects/:path*",
    "/tasks/:path*",
    "/hr/:path*",
    "/finance/:path*",
    "/it-support/:path*",
    "/leave/:path*",
    "/requisitions/:path*",
    "/refunds/:path*",
    "/suggestions/:path*",
  ],
};
