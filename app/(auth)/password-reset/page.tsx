"use client";

import { Suspense } from "react";
import ResetPageContent from "./ResetPageContent";

export default function PasswordResetPage() {
  return (
    <div className="w-full max-w-[380px] px-4 py-6">
      <Suspense
        fallback={
          <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-[#75666f] dark:text-slate-400">Loading...</p>
            </div>
          </div>
        }
      >
        <ResetPageContent />
      </Suspense>
    </div>
  );
}
