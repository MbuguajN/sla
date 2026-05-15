import { getCurrentUser, checkFirstLoginRequired } from "@/lib/permissions";
import { redirect } from "next/navigation";
import ChangePasswordClient from "./ChangePasswordClient";

export const metadata = {
  title: "Set Your Password - 5DM Portal",
  description: "Set your password on first login",
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is required to change password
  const needsPasswordChange = checkFirstLoginRequired(user);

  if (!needsPasswordChange && user.firstLoginAt !== null) {
    // User has already set their password, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <ChangePasswordClient userName={user.name} userEmail={user.email} />
    </div>
  );
}
