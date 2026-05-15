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
    <div className="w-full max-w-[380px] px-4 py-6">
      {step === "request" ? (
        <RequestReset onSuccess={handleResetRequested} />
      ) : (
        <ResetForm email={email} token={token} onSuccess={handleResetComplete} />
      )}
    </div>
  );
}
