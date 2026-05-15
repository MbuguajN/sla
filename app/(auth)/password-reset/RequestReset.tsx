"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/authActions";
import { useTransition } from "react";
import { Loader2, Shield, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RequestResetProps {
  onSuccess: (email: string) => void;
}

export default function RequestReset({ onSuccess }: RequestResetProps) {
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(email);
        
        if (result.success) {
          setResetSent(true);
          setResendCountdown(60);
          onSuccess(email);
          
          const interval = setInterval(() => {
            setResendCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setError(result.message || "Failed to send reset email");
        }
      } catch (err) {
        setError("An error occurred. Please try again.");
        console.error(err);
      }
    });
  };

  if (resetSent) {
    return (
      <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-[#f0f9ff] flex items-center justify-center">
            <Lock className="h-8 w-8 text-[#0ea5e9]" />
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Check Email</h1>
          <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">
            Reset code sent to <strong className="text-[#1b2536] dark:text-white">{email}</strong>
          </p>
        </div>

        <div className="space-y-4 mb-6 text-center">
          <p className="text-[11px] font-bold text-[#75666f] dark:text-slate-400 leading-relaxed uppercase tracking-wider">
            Copy the code from your email (expires in 15 mins). Check spam if it is missing.
          </p>
        </div>

        <button
          onClick={() => setResetSent(false)}
          disabled={resendCountdown > 0}
          type="button"
          className="w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : "Resend Reset Code"}
        </button>

        <div className="mt-6 flex items-center justify-center">
          <Link href="/login" className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#d54b6b] hover:text-[#c91f41]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Login
          </Link>
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
        <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Reset Password</h1>
        <p className="mt-2 text-xs font-semibold text-[#75666f] dark:text-slate-400">Receive a secure reset code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@5dm.africa"
            required
            disabled={isLoading}
            className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Request Reset Code"
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

