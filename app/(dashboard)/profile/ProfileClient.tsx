"use client";

import { useState } from "react";
import { changePassword } from "@/app/actions/profileActions";
import { LogOut, Lock } from "lucide-react";
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
}

export default function ProfileClient({ user }: Props) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-[#fef2f4] flex items-center justify-center">
          <span className="text-[#c91f41] text-lg font-bold">
            {user.name[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Full Name</p>
            <p className="text-base text-gray-900 mt-1">{user.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-base text-gray-900 mt-1">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Role</p>
            <p className="text-base text-gray-900 mt-1 capitalize">{user.role}</p>
          </div>
          {user.department && (
            <div>
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="text-base text-gray-900 mt-1">{user.department.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#c91f41]" />
            <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 bg-[#c91f41] text-white rounded-lg text-sm font-medium hover:bg-[#a61835] transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c91f41]/20 focus:border-[#c91f41]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={changing}
                className="flex-1 px-4 py-2 bg-[#c91f41] text-white rounded-lg font-medium hover:bg-[#a61835] transition-colors disabled:opacity-50"
              >
                {changing ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
