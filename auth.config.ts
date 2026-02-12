import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname === "/"
      const isOnTasks = nextUrl.pathname.startsWith("/tasks")
      const isOnDepartments = nextUrl.pathname.startsWith("/departments")
      const isOnLogin = nextUrl.pathname.startsWith("/login")

      if (isOnDashboard || isOnTasks || isOnDepartments) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnLogin) {
        return Response.redirect(new URL("/", nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
        token.departmentId = (user as any).departmentId
        token.departmentName = (user as any).departmentName
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).departmentName = token.departmentName;
      }
      return session
    }
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
