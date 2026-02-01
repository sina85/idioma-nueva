import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const authMiddleware = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to sign-in if accessing protected route without authentication
  if (!user && request.nextUrl.pathname.startsWith("/")) {
    // Skip auth check for public routes
    const publicPaths = ["/sign-in", "/sign-up", "/api/auth", "/forgot-password", "/reset-password"];
    const isPublicPath = publicPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (!isPublicPath && !request.nextUrl.pathname.startsWith("/_next")) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
};
