"use client";

import { useState } from "react";
import Link from "next/link";
import RequestReset from "./RequestReset";
import ResetForm from "./ResetForm";

export default function PasswordResetPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const handleResetRequested = (resetEmail: string, resetToken: string) => {
    setEmail(resetEmail);
    setToken(resetToken);
    setStep("reset");
  };

  const handleResetComplete = () => {
    setStep("request");
    setEmail("");
    setToken("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="w-full max-w-md">
        {step === "request" ? (
          <RequestReset onSuccess={handleResetRequested} />
        ) : (
          <ResetForm email={email} token={token} onSuccess={handleResetComplete} />
        )}

        <div className="mt-6 text-center text-sm text-white/90">
          <Link href="/login" className="hover:text-white underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
