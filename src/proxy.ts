import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  if (isAdminPage) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", req.nextUrl));
    }

    if (req.auth?.user?.role !== "super_admin") {
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }

    return null;
  }

  if (isDashboardPage) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", req.nextUrl));
    }
    return null;
  }

  return null;
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
