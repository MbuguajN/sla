"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { changeFirstLoginPassword, completeInvitePasswordSetup, resetPassword } from "@/app/actions/authActions";
import { Loader2, Shield, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

interface BaseProps {
  userEmail: string;
  logos?: { light: string | null; dark: string | null } | null;
}

interface AuthenticatedProps extends BaseProps {
  mode: "authenticated";
  userId: number;
}

interface InviteProps extends BaseProps {
  mode: "invite";
  inviteToken: string;
}

interface ResetProps extends BaseProps {
  mode: "reset";
  resetToken: string;
}

type ChangePasswordClientProps = AuthenticatedProps | InviteProps | ResetProps;

export default function ChangePasswordClient(props: ChangePasswordClientProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!newPassword) validationErrors.push("New password is required");
    if (newPassword !== confirmPassword) validationErrors.push("Passwords do not match");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result =
        props.mode === "invite"
          ? await completeInvitePasswordSetup(props.inviteToken, newPassword)
          : props.mode === "reset"
          ? await resetPassword(props.userEmail, props.resetToken, newPassword)
          : await changeFirstLoginPassword(props.userId, newPassword);

      if (!result.success) {
        setErrors(result.message.split("\n"));
        return;
      }

      const loginResult = await signIn("credentials", {
        email: props.userEmail,
        password: newPassword,
        redirect: false,
      });

      if (loginResult?.error) {
        setErrors([
          "Password was updated, but we could not refresh your session. Please log in again.",
        ]);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setErrors(["An error occurred. Please try again."]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-[#f0fdf4] flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-[#16a34a]" />
          </div>
        </div>
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Password Saved</h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">
          Your password has been securely updated. Redirecting to your dashboard...
        </p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#c91f41]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
      <div className="flex justify-center mb-6">
        {props.logos?.light || props.logos?.dark ? (
          <div className="h-20 flex items-center justify-center">
            {props.logos?.light && (
              <img
                src={props.logos.light}
                alt="System logo"
                className="h-20 w-auto object-contain dark:hidden"
              />
            )}
            {props.logos?.dark && (
              <img
                src={props.logos.dark}
                alt="System logo"
                className="h-20 w-auto object-contain hidden dark:block"
              />
            )}
          </div>
        ) : (
          <div className="h-16 w-16 rounded-full bg-[#fff1f4] flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#c91f41]" />
          </div>
        )}
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">
          {props.mode === "invite"
            ? "Set Your Password"
            : props.mode === "reset"
            ? "Create New Password"
            : "Change Password"}
        </h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">
          {props.mode === "invite"
            ? "Use this secure invite to create your password and activate your account."
            : props.mode === "reset"
            ? "Enter a new secure password to regain access to your account."
            : "Create a new password before continuing to your dashboard."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {errors.map((error, idx) => (
              <p key={idx}>• {error}</p>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a secure password"
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 pr-11 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
              disabled={isLoading}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#75666f] dark:text-slate-400 hover:text-[#c91f41]"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 pr-11 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#75666f] dark:text-slate-400 hover:text-[#c91f41]"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Password"
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center">
        <Link href="/login" className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#d54b6b] hover:text-[#c91f41]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-[#6d6169] dark:text-slate-400">
        <Lock className="h-3.5 w-3.5" />
        <span className="text-[11px] font-black uppercase tracking-[0.15em]">Secure Auth System</span>
      </div>
    </div>
  );
}
