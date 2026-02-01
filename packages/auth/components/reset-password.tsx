"use client";

import { createClient } from "../client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if we have a valid recovery session from the URL hash
    const checkSession = async () => {
      // The hash contains the access_token from Supabase recovery link
      const hash = window.location.hash;
      console.log("Hash:", hash);

      if (hash && hash.includes("access_token") && hash.includes("type=recovery")) {
        // Parse the hash fragment to extract tokens
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        console.log("Access token found:", !!accessToken);
        console.log("Refresh token found:", !!refreshToken);

        if (accessToken && refreshToken) {
          // Manually set the session using the tokens from the URL
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          console.log("setSession result:", { data, error: sessionError });

          if (sessionError || !data.session) {
            setIsValidSession(false);
            setError(`Invalid or expired recovery link: ${sessionError?.message || "No session created"}`);
          } else {
            setIsValidSession(true);
            // Clear the hash from the URL for cleaner appearance
            window.history.replaceState(null, "", window.location.pathname);
          }
        } else {
          setIsValidSession(false);
          setError("Invalid recovery link. Missing required tokens.");
        }
      } else {
        // No recovery token in URL - check if user came here directly with a session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Existing session check:", session);
        if (session) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
          setError("No recovery session found. Please request a password reset first.");
        }
      }
    };

    checkSession();
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      // Redirect to home after a short delay
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Verifying your recovery link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Password Updated</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully reset. Redirecting you to the app...
          </p>
        </div>
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-md text-center">
          Password updated successfully!
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md">
            {error}
          </div>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="text-primary underline-offset-4 hover:underline"
          >
            Request a new password reset
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>
      <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            required
            autoComplete="new-password"
            className="px-4 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
            autoComplete="new-password"
            className="px-4 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Updating password..." : "Update Password"}
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
