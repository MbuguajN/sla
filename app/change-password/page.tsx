import Link from "next/link";
import { redirect } from "next/navigation";
import { checkFirstLoginRequired, validateInviteToken, validatePasswordResetToken } from "@/app/actions/authActions";
import { getCurrentUser } from "@/lib/permissions";
import ChangePasswordClient from "./ChangePasswordClient";

export const metadata = {
  title: "Set Your Password - 5DM Portal",
  description: "Set your password on first login",
};

type ChangePasswordSearchParams = {
  invite?: string | string[];
  reset?: string | string[];
  email?: string | string[];
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams?: ChangePasswordSearchParams;
}) {
  const inviteToken = Array.isArray(searchParams?.invite)
    ? searchParams?.invite[0]
    : searchParams?.invite;
  
  const resetCode = Array.isArray(searchParams?.reset)
    ? searchParams?.reset[0]
    : searchParams?.reset;
  
  const resetEmail = Array.isArray(searchParams?.email)
    ? searchParams?.email[0]
    : searchParams?.email;

  // Handle reset flow
  if (resetCode && resetEmail) {
    const resetValidation = await validatePasswordResetToken(resetEmail, resetCode);

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edeef3] dark:bg-black p-4">
        {resetValidation.isValid ? (
          <ChangePasswordClient
            mode="reset"
            resetToken={resetCode}
            userEmail={resetEmail}
          />
        ) : (
          <div className="w-full max-w-md rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm text-center">
            <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">
              Reset Link Expired
            </h1>
            <p className="mt-3 text-sm text-[#75666f] dark:text-slate-400">
              {resetValidation.error || "This password reset link is no longer valid."}
            </p>
            <div className="mt-6">
              <Link
                href="/password-reset"
                className="inline-flex items-center justify-center h-12 rounded-xl bg-[#c91f41] px-5 text-white text-sm font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors"
              >
                Request New Reset Code
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle invite flow
  if (inviteToken) {
    const inviteValidation = await validateInviteToken(inviteToken);

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edeef3] dark:bg-black p-4">
        {inviteValidation.isValid && inviteValidation.email && inviteValidation.userId ? (
          <ChangePasswordClient
            mode="invite"
            inviteToken={inviteToken}
            userEmail={inviteValidation.email}
          />
        ) : (
          <div className="w-full max-w-md rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm text-center">
            <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">
              Invitation Expired
            </h1>
            <p className="mt-3 text-sm text-[#75666f] dark:text-slate-400">
              {inviteValidation.error || "This invitation link is no longer valid."}
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-12 rounded-xl bg-[#c91f41] px-5 text-white text-sm font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is required to change password
  const needsPasswordChange = await checkFirstLoginRequired(user.id);

  if (!needsPasswordChange) {
    // User has already set their password, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#edeef3] dark:bg-black p-4">
      <ChangePasswordClient mode="authenticated" userId={user.id} userEmail={user.email} />
    </div>
  );
}
