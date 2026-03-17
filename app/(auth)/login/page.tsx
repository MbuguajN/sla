"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function LoginForm() {
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
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="w-full px-4 py-3 rounded-lg bg-[#dbeafe] border-0 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#c91f41] focus:outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          className="w-full px-4 py-3 rounded-lg bg-[#dbeafe] border-0 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#c91f41] focus:outline-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-lg bg-[#c91f41] hover:bg-[#a91835] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md mx-auto px-6">
      {/* Logo / Brand */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#c91f41] mb-4">
          <span className="text-white font-bold text-xl">OC</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Control</h1>
        <p className="text-gray-500 mt-2">Sign in To Your Account</p>
      </div>

      {/* Login Form */}
      <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#c91f41]" /></div>}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-xs text-gray-400 mt-8">
        Enterprise Project Management System
      </p>
    </div>
  );
}
