import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const title = "Reset Password";
const description = "Enter your new password.";
const ResetPassword = dynamic(() =>
  import("@repo/auth/components/reset-password").then((mod) => mod.ResetPassword)
);

export const metadata: Metadata = createMetadata({ title, description });

const ResetPasswordPage = () => <ResetPassword />;

export default ResetPasswordPage;
