"use client";

import { createClient } from "../client";
import { useState } from "react";
import Link from "next/link";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-md text-center">
          Check your inbox and click the link to reset your password.
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the email?{" "}
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-primary underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            className="px-4 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
