import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardPage) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", req.nextUrl));
    }
    return null;
  }

  return null;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
