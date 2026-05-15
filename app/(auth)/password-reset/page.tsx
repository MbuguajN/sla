"use client";

import { useState } from "react";
import Link from "next/link";
import RequestReset from "./RequestReset";
import CodeEntry from "./CodeEntry";

export default function PasswordResetPage() {
  const [step, setStep] = useState<"request" | "code-entry">("request");
  const [email, setEmail] = useState("");

  const handleResetRequested = (resetEmail: string) => {
    setEmail(resetEmail);
    setStep("code-entry");
  };

  const handleResetComplete = () => {
    setStep("request");
    setEmail("");
  };

  return (
    <div className="w-full max-w-[380px] px-4 py-6">
      {step === "request" ? (
        <RequestReset onSuccess={handleResetRequested} />
      ) : (
        <CodeEntry email={email} onBack={() => setStep("request")} />
      )}
    </div>
  );
}
