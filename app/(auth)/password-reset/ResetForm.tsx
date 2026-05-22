"use client";

import { useState } from "react";
import { resetPassword } from "@/app/actions/authActions";
import { useTransition } from "react";
import Link from "next/link";
import { Loader2, Shield, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

interface ResetFormProps {
  email: string;
  token: string;
  onSuccess: () => void;
}

export default function ResetForm({ email, token, onSuccess }: ResetFormProps) {
  const [resetCode, setResetCode] = useState(token);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!resetCode) validationErrors.push("Reset code is required");
    if (!newPassword) validationErrors.push("New password is required");
    if (newPassword !== confirmPassword) validationErrors.push("Passwords do not match");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetPassword(email, resetCode, newPassword);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess();
            window.location.href = "/login";
          }, 2000);
        } else {
          setErrors([result.message || "Failed to reset password"]);
        }
      } catch (err) {
        setErrors(["An error occurred. Please try again."]);
        console.error(err);
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-[#f0fdf4] flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-[#16a34a]" />
          </div>
        </div>
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Reset Success</h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">Your password has been securely updated.</p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[11px] font-bold text-[#75666f] uppercase tracking-widest">Redirecting to login portal...</p>
          <Loader2 className="h-5 w-5 animate-spin text-[#c91f41]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-full bg-[#fff1f4] flex items-center justify-center">
          <Shield className="h-8 w-8 text-[#c91f41]" />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">New Password</h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">Enter your code and set a new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 uppercase tracking-tight">
            {errors.map((error, idx) => <div key={idx}>• {error}</div>)}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">Reset Code</label>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            required
            disabled={isLoading}
            className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-bold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35 tracking-[0.3em] text-center"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 pr-11 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
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
          <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 pr-11 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
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
            <><Loader2 className="h-4 w-4 animate-spin" />Updating...</>
          ) : (
            "Complete Reset"
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center">
        <Link href="/login" className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#d54b6b] hover:text-[#c91f41]">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Login
        </Link>
      </div>
    </div>
  );
}

