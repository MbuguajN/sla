"use client";

import { useState } from "react";
import { resetPassword } from "@/app/actions/authActions";
import { useTransition } from "react";
import Link from "next/link";
import { getPasswordRequirementsText } from "@/lib/validators";

interface ResetFormProps {
  email: string;
  token: string;
  onSuccess: () => void;
}

export default function ResetForm({ email, token, onSuccess }: ResetFormProps) {
  const [resetCode, setResetCode] = useState(token);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [isLoading, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);

    // Validation
    const validationErrors: string[] = [];

    if (!resetCode) {
      validationErrors.push("Reset code is required");
    }

    if (!newPassword) {
      validationErrors.push("New password is required");
    }

    if (newPassword !== confirmPassword) {
      validationErrors.push("Passwords do not match");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetPassword(email, resetCode, newPassword);

        if (result.success) {
          setSuccess(true);
          // Redirect to login after 2 seconds
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
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset</h1>
          <p className="text-gray-600 mt-3">Your password has been successfully reset</p>
          <p className="text-sm text-gray-500 mt-2">You will be redirected to login in a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Set New Password</h1>
        <p className="text-gray-600 mt-2">Enter your reset code and new password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-red-700">
                • {error}
              </p>
            ))}
          </div>
        )}

        {/* Reset Code Input */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Reset Code
          </label>
          <input
            id="code"
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.toUpperCase())}
            placeholder="Enter code from email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            disabled={isLoading}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Found in your reset email (15 minute expiry)</p>
        </div>

        {/* New Password */}
        <div className="pt-2">
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        {/* Password Requirements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 whitespace-pre-line">
            {getPasswordRequirementsText()}
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition mt-6"
        >
          {isLoading ? "Resetting Password..." : "Reset Password"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          Didn't receive the code?{" "}
          <button
            onClick={() => {
              window.history.back();
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            Request new code
          </button>
        </p>
      </div>
    </div>
  );
}
