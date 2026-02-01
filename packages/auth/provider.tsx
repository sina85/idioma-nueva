"use client";

import type { ReactNode } from "react";

export type AuthProviderProps = {
  children: ReactNode;
  helpUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
};

// Supabase Auth doesn't require a Provider component for basic functionality
// The props are accepted for compatibility but not used
export const AuthProvider = ({ children }: AuthProviderProps) => children;
