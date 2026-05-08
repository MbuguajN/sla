"use client";

import { useState, type ComponentType } from "react";
import { useEffect } from "react";
import { changePassword } from "@/app/actions/profileActions";
import { LogOut, Shield, UserRound, Mail, Briefcase, Building2 } from "lucide-react";
import { signOut } from "next-auth/react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: { name: string } | null;
}

interface Props {
  user: User;
  equipmentItems: {
    id: number;
    make: string;
    model: string;
    serialNumber: string;
  }[];
}

export default function ProfileClient({ user, equipmentItems }: Props) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setChanging(true);
    try {
      await changePassword(oldPassword, newPassword);
      alert("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden">
        <div className="bg-gradient-to-r from-[#c91f41]/10 via-[#c91f41]/5 to-transparent dark:from-[#c91f41]/20 dark:via-[#c91f41]/10 px-6 py-7 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-black border border-[#f3d8de] dark:border-white/10 flex items-center justify-center">
              <span className="text-[#c91f41] text-xl font-black">{user.name[0]?.toUpperCase() || "U"}</span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c91f41]">Account Center</p>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Profile Settings</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Manage your account details and security access.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-6 md:border-r border-gray-100 dark:border-white/10 space-y-5">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">Identity</h2>
            <Field icon={UserRound} label="Full Name" value={user.name} />
            <Field icon={Mail} label="Email" value={user.email} />
            <Field icon={Briefcase} label="Role" value={user.role} capitalize />
            <Field icon={Building2} label="Department" value={user.department?.name || "Unassigned"} />
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#c91f41]" />
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Security</h2>
              </div>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-[#c91f41] text-white rounded-xl text-sm font-bold hover:bg-[#a61835] transition-colors"
                >
                  Change Password
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Use a strong password and avoid reusing old passwords.</p>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
                <label className="block text-xs font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-500">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                />

                <label className="block text-xs font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-500">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                />

                <label className="block text-xs font-black uppercase tracking-[0.12em] text-gray-500 dark:text-zinc-500">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={changing}
                    className="flex-1 px-4 py-2 bg-[#c91f41] text-white rounded-xl font-bold hover:bg-[#a61835] transition-colors disabled:opacity-50"
                  >
                    {changing ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-zinc-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111111] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-gray-400 dark:text-zinc-500">Company Items Owned</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Assigned equipment linked to your account.</p>
        </div>

        {equipmentItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 dark:text-zinc-600 font-black tracking-[0.16em] uppercase border-b border-gray-100 dark:border-white/10">
                  <th className="px-6 py-3">Make</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Serial Number</th>
                </tr>
              </thead>
              <tbody>
                {equipmentItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-white/10 last:border-0">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{item.make}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-300">{item.model}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-zinc-400">{item.serialNumber || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">No company items assigned yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 text-[11px] font-black uppercase tracking-[0.16em]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-1 text-sm font-bold text-gray-900 dark:text-white ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
