"use client";

import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Re-export UserButton component
export { UserButton } from "./components/user-button";

// Stub component for compatibility with NextForge's existing code
// OrganizationSwitcher is not needed for Supabase auth
type OrganizationSwitcherProps = {
  afterSelectOrganizationUrl?: string;
  hidePersonal?: boolean;
  [key: string]: any;
};

export const OrganizationSwitcher = (_props?: OrganizationSwitcherProps) => null;
