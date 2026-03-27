import { Suspense } from "react";
import { getCompanyLogos } from "@/app/actions/adminActions";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const logos = await getCompanyLogos();

  return (
    <Suspense fallback={<div className="h-[520px] w-full max-w-[480px] rounded-xl bg-[#fbfbfc]" />}>
      <LoginClient logos={logos} />
    </Suspense>
  );
}
