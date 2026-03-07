import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";
import { ExtendedUser } from "./next-auth.d";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user as ExtendedUser | undefined;
  const userRole = user?.role;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isUsersRoute = nextUrl.pathname.startsWith("/dashboard/users");
  const isAuthRoute = nextUrl.pathname.startsWith("/auth");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Protect all dashboard routes for unauthenticated users
  if (!isLoggedIn && isDashboardRoute) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  // Deny access if business is inactive (logical deletion) or account is disabled
  if (isLoggedIn && isDashboardRoute) {
    if (user?.planStatus === "INACTIVE" || user?.isActive === false) {
      return NextResponse.redirect(new URL("/auth/login?error=inactive", nextUrl));
    }
  }

  // Protect /dashboard/users for non-admin users
  if (isUsersRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
