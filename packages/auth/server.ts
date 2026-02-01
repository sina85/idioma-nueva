import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

// Helper function to get the current user
export const currentUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

// Helper function to get the current user's auth info
export const auth = async () => {
  const user = await currentUser();

  if (!user) {
    return { userId: null };
  }

  return {
    userId: user.id,
  };
};

// Stub exports for compatibility with NextForge's existing code
// These would need proper implementation if organizations feature is needed
export const clerkClient = null;
export type OrganizationMembership = Record<string, unknown>;
