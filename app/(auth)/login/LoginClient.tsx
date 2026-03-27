"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Shield } from "lucide-react";

interface Props {
  logos?: { light: string | null; dark: string | null } | null;
}

export default function LoginClient({ logos }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] px-4 py-6">
      <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
        <div className="flex justify-center mb-6">
          {logos?.light || logos?.dark ? (
            <div className="h-20 flex items-center justify-center">
              {logos?.light && (
                <img
                  src={logos.light}
                  alt="System logo"
                  className="h-20 w-auto object-contain dark:hidden"
                />
              )}
              {logos?.dark && (
                <img
                  src={logos.dark}
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
          <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Welcome Back</h1>
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
              placeholder="name@crimson.gallery"
              required
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                className="text-[11px] font-black uppercase tracking-[0.06em] text-[#d54b6b] hover:text-[#c91f41]"
              >
                Reset?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Secure Login"
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[#6d6169] dark:text-slate-300">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em]">Encrypted Enterprise Access</span>
        </div>
      </div>

      <p className="mt-5 text-center text-xs font-medium text-[#726a72] dark:text-slate-300">
        Protected by 256-bit SSLEncryption.
        <span className="font-black text-[#2b3648] dark:text-white"> Privacy Policy</span>
      </p>
    </div>
  );
}
