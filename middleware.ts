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

    // HR routes - HR department or admin (admin can view, not act)
    if (path.startsWith("/hr")) {
      if (!isHR && !isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Finance routes - Finance department or admin (admin can view, not act)
    if (path.startsWith("/finance")) {
      if (!isFinance && !isAdmin) {
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
    "/equipment/:path*",
    "/leave/:path*",
    "/requisitions/:path*",
    "/refunds/:path*",
    "/suggestions/:path*",
  ],
};
