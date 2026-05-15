"use client";

import React, { useState } from "react";
import { validatePasswordResetToken } from "@/app/actions/authActions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Lock, ArrowLeft } from "lucide-react";

interface CodeEntryProps {
  email: string;
  onBack: () => void;
}

export default function CodeEntry({ email, onBack }: CodeEntryProps) {
  const router = useRouter();
  const [resetCode, setResetCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(15 * 60); // 15 minutes in seconds

  // Countdown timer
  React.useEffect(() => {
    if (codeExpiry <= 0) return;
    const interval = setInterval(() => {
      setCodeExpiry((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProceed = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);

    if (!resetCode) {
      setErrors(["Reset code is required"]);
      return;
    }

    if (codeExpiry <= 0) {
      setErrors(["Reset code has expired. Please request a new one."]);
      onBack();
      return;
    }

    setIsLoading(true);
    try {
      const validation = await validatePasswordResetToken(email, resetCode);
      if (!validation.isValid) {
        setErrors([validation.error || "Invalid reset code"]);
        setIsLoading(false);
        return;
      }

      // Valid code, redirect to change-password with reset context
      router.push(`/change-password?reset=${encodeURIComponent(resetCode)}&email=${encodeURIComponent(email)}`);
    } catch (err) {
      setErrors(["An error occurred. Please try again."]);
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-full bg-[#fff1f4] flex items-center justify-center">
          <Shield className="h-8 w-8 text-[#c91f41]" />
        </div>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">
          Enter Reset Code
        </h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">
          Paste the code from your email
        </p>
      </div>

      <form onSubmit={handleProceed} className="space-y-4">
        {errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 uppercase tracking-tight">
            {errors.map((error, idx) => (
              <div key={idx}>• {error}</div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
            Reset Code
          </label>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.toUpperCase())}
            placeholder="Paste code here"
            required
            disabled={isLoading}
            className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-bold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35 tracking-[0.15em] text-center"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tight">
            Code expires in
          </span>
          <span className="text-[13px] font-black text-amber-900 dark:text-amber-200 font-mono">
            {formatTime(codeExpiry)}
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading || codeExpiry <= 0}
          className="mt-1 w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            "Proceed to Change Password"
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        type="button"
        className="w-full mt-3 h-10 rounded-xl border border-[#e9ebf0] dark:border-white/10 text-[#c91f41] text-sm font-black tracking-tight hover:bg-[#f9fafb] dark:hover:bg-white/5 transition-colors flex items-center justify-center"
      >
        Request New Code
      </button>

      <div className="mt-6 flex items-center justify-center">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#d54b6b] hover:text-[#c91f41]"
        >
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
