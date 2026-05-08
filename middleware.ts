import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const isAdmin = token?.role === "ADMIN";
    const isCEO = token?.role === "CEO";
    const isHR = token?.departmentSlug === "human-resources";
    const isFinance = token?.departmentSlug === "finance";

    if (path === "/") {
      return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/dashboard", req.url));
    }

    // Admin-only routes
    if (path.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Keep admin users in admin panel, not department dashboards.
    if (path.startsWith("/dashboard") && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (!isCEO && (isHR || isFinance)) {
      const blocksOperationalRoutes =
        path.startsWith("/clients") ||
        path.startsWith("/projects") ||
        path.startsWith("/tasks");

      if (blocksOperationalRoutes) {
        return NextResponse.redirect(
          new URL(isFinance ? "/dashboard" : "/hr/leaves", req.url)
        );
      }
    }

    // HR/Finance route-level access is enforced inside server pages/actions using
    // fresh DB-backed user data. Avoid blocking here on possibly stale JWT claims.

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/clients/:path*",
    "/projects/:path*",
    "/tasks/:path*",
    "/manager/:path*",
    "/profile/:path*",
    "/hr/:path*",
    "/finance/:path*",
    "/it-support/:path*",
    "/equipment/:path*",
    "/leave/:path*",
    "/requisitions/:path*",
    "/refunds/:path*",
    "/suggestions/:path*",
  ],
};
