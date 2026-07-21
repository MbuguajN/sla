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
    const isGeneralStaff = token?.departmentSlug === "general-staff";

    if (path === "/") {
      if (isAdmin) return NextResponse.redirect(new URL("/admin", req.url));
      if (isGeneralStaff) return NextResponse.redirect(new URL("/leave", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Admin-only routes
    if (path.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Keep admin users in admin panel, not department dashboards.
    if (path.startsWith("/dashboard") && isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (!isCEO && isHR) {
      const blocksOperationalRoutes =
        path.startsWith("/clients") ||
        path.startsWith("/projects") ||
        path.startsWith("/tasks");

      if (blocksOperationalRoutes) {
        return NextResponse.redirect(new URL("/hr/leaves", req.url));
      }
    }

    // General Staff: only allow personal pages
    if (isGeneralStaff && !isAdmin && !isCEO) {
      const blockedRoutes =
        path.startsWith("/dashboard") ||
        path.startsWith("/clients") ||
        path.startsWith("/projects") ||
        path.startsWith("/tasks") ||
        path.startsWith("/board") ||
        path.startsWith("/daily-log") ||
        path.startsWith("/reports") ||
        path.startsWith("/employees") ||
        path.startsWith("/manager") ||
        path.startsWith("/hr") ||
        path.startsWith("/finance");

      if (blockedRoutes) {
        return NextResponse.redirect(new URL("/leave", req.url));
      }
    }

    // HR/Finance route-level access is enforced inside server pages/actions using
    // fresh DB-backed user data. Avoid blocking here on possibly stale JWT claims.

    // Force password setup only for invited users who still have onboarding pending.
    if (path !== "/change-password" && !path.startsWith("/logout") && !path.startsWith("/api/") && token?.passwordSetupRequired) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

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
    "/daily-log/:path*",
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