import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const title = "Forgot Password";
const description = "Request a password reset link.";
const ForgotPassword = dynamic(() =>
  import("@repo/auth/components/forgot-password").then((mod) => mod.ForgotPassword)
);

export const metadata: Metadata = createMetadata({ title, description });

const ForgotPasswordPage = () => <ForgotPassword />;

export default ForgotPasswordPage;
