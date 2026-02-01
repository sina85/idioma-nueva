import { authMiddleware } from "@repo/auth/proxy";
import {
  noseconeOptions,
  noseconeOptionsWithToolbar,
  securityMiddleware,
} from "@repo/security/proxy";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "./env";

const securityHeaders = env.FLAGS_SECRET
  ? securityMiddleware(noseconeOptionsWithToolbar)
  : securityMiddleware(noseconeOptions);

// Export as proxy function for Next.js 16
export async function proxy(request: NextRequest) {
  // Run auth middleware
  const authResult = await authMiddleware(request);

  // If auth middleware returns a response, use it
  if (authResult) {
    return authResult;
  }

  // Apply security headers
  const response = NextResponse.next();
  const headers = await securityHeaders();

  // Copy security headers to response
  if (headers instanceof Response) {
    headers.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
