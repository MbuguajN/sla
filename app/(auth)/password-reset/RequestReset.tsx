"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/authActions";
import { useTransition } from "react";

interface RequestResetProps {
  onSuccess: (email: string, token: string) => void;
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
          setResendCountdown(60); // 60 second countdown
          
          // Start countdown
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
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-gray-600 text-center">
            We've sent a password reset code to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 text-center">
            The code will expire in 15 minutes. If you don't see the email, check your spam folder.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>👉 Next step:</strong> Copy the code from the email or click the link to reset your password.
          </p>
        </div>

        <button
          onClick={() => {
            setResetSent(false);
            setEmail("");
          }}
          disabled={resendCountdown > 0}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
        >
          {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-gray-600 mt-2">Enter your email to receive a reset code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@5dm.africa"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition mt-6"
        >
          {isLoading ? "Sending..." : "Send Reset Code"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Tip:</strong> Make sure your email domain is @5dm.africa or @myhappyhour.co.ke
        </p>
      </div>
    </div>
  );
}
