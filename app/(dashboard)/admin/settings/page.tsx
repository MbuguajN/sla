import { redirect } from "next/navigation";
import { getCurrentUser, canManageSystemSettings } from "@/lib/permissions";
import { db } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import { getCompanyLogos } from "@/app/actions/adminActions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSystemSettings(user)) redirect("/dashboard");

  const [settings, logoPaths] = await Promise.all([
    db.systemSetting.findMany({
      orderBy: { key: "asc" },
    }),
    getCompanyLogos(),
  ]);

  return (
    <SettingsClient
      initialSettings={settings.map((s) => ({
        id: s.id,
        key: s.key,
        value: s.value,
      }))}
      initialLogos={logoPaths}
    />
  );
}
