import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getUserProfile } from "@/app/actions/profileActions";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  return (
    <ProfileClient
      user={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        department: profile.department,
      }}
      equipmentItems={profile.equipmentOwned.map((item) => ({
        id: item.id,
        make: item.make,
        model: item.model,
        serialNumber: item.serialNumber || "",
      }))}
      personalDocuments={profile.personalDocuments.map((doc) => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
      }))}
    />
  );
}
