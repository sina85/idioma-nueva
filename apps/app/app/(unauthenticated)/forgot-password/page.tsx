import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const title = "Forgot Password";
const description = "Request a password reset link.";
const ForgotPassword = nextDynamic(() =>
  import("@repo/auth/components/forgot-password").then((mod) => mod.ForgotPassword)
);

export const metadata: Metadata = createMetadata({ title, description });

const ForgotPasswordPage = () => <ForgotPassword />;

export default ForgotPasswordPage;
