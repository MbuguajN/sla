"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import RequestReset from "./RequestReset";
import CodeEntry from "./CodeEntry";

export default function ResetPageContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"request" | "code-entry">("request");
  const [email, setEmail] = useState("");

  // Handle URL parameters (e.g., from email link)
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    const emailFromUrl = searchParams.get("email");
    
    if (codeFromUrl && emailFromUrl) {
      setEmail(decodeURIComponent(emailFromUrl));
      setStep("code-entry");
    }
  }, [searchParams]);

  const handleResetRequested = (resetEmail: string) => {
    setEmail(resetEmail);
    setStep("code-entry");
  };

  return (
    <>
      {step === "request" ? (
        <RequestReset onSuccess={handleResetRequested} />
      ) : (
        <CodeEntry email={email} onBack={() => setStep("request")} initialCode={searchParams.get("code") || ""} />
      )}
    </>
  );
}
