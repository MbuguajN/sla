export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCompanyLogos } from "@/app/actions/adminActions";
import { getCurrentUser } from "@/lib/permissions";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const [logos, user] = await Promise.all([getCompanyLogos(), getCurrentUser()]);
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
  const enableGoogleSignin = process.env.ENABLE_GOOGLE_SIGNIN === "true" && Boolean(googleClientId);

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <Suspense fallback={<div className="h-[520px] w-full max-w-[480px] rounded-xl bg-[#fbfbfc]" />}>
      <LoginClient
        logos={logos}
        googleClientId={googleClientId}
        enableGoogleSignin={enableGoogleSignin}
      />
    </Suspense>
  );
}
