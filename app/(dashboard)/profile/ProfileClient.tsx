"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { changePassword, addPersonalDocument, updatePersonalDocument, deletePersonalDocument, updatePersonalInfo, updateUserLeaveOverride } from "@/app/actions/profileActions";

type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  department: { id: number; name: string; slug: string } | null;
  employmentDate: string | null;
  maritalStatus: string | null;
  gender: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
};

type LeaveBalance = {
  type: string;
  label: string;
  color: string;
  used: number;
  allowed: number;
  remaining: number;
  percentage: number;
};

type Doc = {
  id: number;
  name: string;
  url: string;
  category: string;
  accessLevel: string;
  createdAt: string;
};

type CompanyItem = {
  id: number;
  name: string;
  category: string | null;
  serialNumber: string | null;
};

interface Props {
  profile: Profile;
  completedTasks: number;
  activeTasks: number;
  leaveBalances: LeaveBalance[];
  documents: Doc[];
  companyItems: CompanyItem[];
  currentRole: string;
  currentDepartmentSlug: string;
}

const AVATAR_COLORS = [
  "#c91f41", "#6366f1", "#059669", "#d97706", "#7c3aed",
  "#0891b2", "#be185d", "#4f46e5", "#0d9488", "#b45309",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = { ADMIN: "Administrator", CEO: "Director", MANAGER: "Manager", EMPLOYEE: "Employee" };
  return labels[role] || role;
}

export default function ProfileClient({
  profile,
  completedTasks,
  activeTasks,
  leaveBalances,
  documents,
  companyItems,
  currentRole,
  currentDepartmentSlug,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const color = getAvatarColor(profile.name);
  const initials = getInitials(profile.name);
  const totalTasks = completedTasks + activeTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isHr = currentRole === "ADMIN" || currentDepartmentSlug === "human-resources";

  // Personal info state
  const [personalInfo, setPersonalInfo] = useState({
    employmentDate: profile.employmentDate ? new Date(profile.employmentDate).toISOString().split("T")[0] : "",
    maritalStatus: profile.maritalStatus || "",
    gender: profile.gender || "",
    phoneNumber: profile.phoneNumber || "",
    address: profile.address || "",
    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
    emergencyContactRelation: profile.emergencyContactRelation || "",
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Document state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docCategory, setDocCategory] = useState("Contract");
  const [docAccessLevel, setDocAccessLevel] = useState("Restricted");
  const [uploading, setUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocCategory, setEditDocCategory] = useState("");
  const [editDocAccessLevel, setEditDocAccessLevel] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Leave override state
  const [editingLeaveType, setEditingLeaveType] = useState<string | null>(null);
  const [overrideDays, setOverrideDays] = useState("");

  async function handleSavePersonal() {
    setSavingPersonal(true);
    try {
      await updatePersonalInfo({
        employmentDate: personalInfo.employmentDate || null,
        maritalStatus: personalInfo.maritalStatus || null,
        gender: personalInfo.gender || null,
        phoneNumber: personalInfo.phoneNumber || null,
        address: personalInfo.address || null,
        dateOfBirth: personalInfo.dateOfBirth || null,
        emergencyContactName: personalInfo.emergencyContactName || null,
        emergencyContactPhone: personalInfo.emergencyContactPhone || null,
        emergencyContactRelation: personalInfo.emergencyContactRelation || null,
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to save");
    }
    setSavingPersonal(false);
  }

  async function handleUpload() {
    if (!docName.trim() || !docUrl.trim()) return;
    setUploading(true);
    try {
      await addPersonalDocument(docName.trim(), docUrl.trim(), docCategory, docAccessLevel);
      setDocName(""); setDocUrl(""); setDocCategory("Contract"); setDocAccessLevel("Restricted");
      setShowUploadForm(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Upload failed");
    }
    setUploading(false);
  }

  async function handleUpdateDoc(docId: number) {
    try {
      await updatePersonalDocument(docId, { name: editDocName.trim(), category: editDocCategory, accessLevel: editDocAccessLevel });
      setEditingDocId(null); setOpenDropdownId(null);
      router.refresh();
    } catch (err: any) { alert(err.message || "Update failed"); }
  }

  async function handleDeleteDoc(docId: number) {
    if (!confirm("Delete this document?")) return;
    try {
      await deletePersonalDocument(docId);
      setOpenDropdownId(null);
      router.refresh();
    } catch (err: any) { alert(err.message || "Delete failed"); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert("Passwords do not match"); return; }
    if (newPassword.length < 6) { alert("Password must be at least 6 characters"); return; }
    setChangingPw(true);
    try {
      await changePassword(oldPassword, newPassword);
      alert("Password changed successfully");
      setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordForm(false);
    } catch (err: any) {
      alert(err.message || "Failed to change password");
    }
    setChangingPw(false);
  }

  async function handleOverrideLeave(leaveType: string) {
    const days = parseFloat(overrideDays);
    if (isNaN(days) || days < 0) { alert("Enter a valid number of days"); return; }
    try {
      await updateUserLeaveOverride(profile.id, leaveType, days);
      setEditingLeaveType(null); setOverrideDays("");
      router.refresh();
    } catch (err: any) { alert(err.message || "Failed to update"); }
  }

  const inputClass = "w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c91f41]/20 outline-none transition-all";

  return (
    <div className="mx-auto max-w-[1280px] space-y-0 px-4 pb-8 pt-4">
      <button
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500 hover:text-[#c91f41] dark:text-zinc-400 dark:hover:text-[#c91f41] transition-colors mb-6"
      >
        <ArrowLeft01Icon className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* HERO */}
      <section className="overflow-hidden border-b-4 border-[#c91f41] bg-white dark:bg-black/40">
        <div className="grid grid-cols-12 gap-6 md:gap-10 p-5 md:p-8 lg:p-10">
          <div className="col-span-12 flex flex-col items-center gap-4 lg:col-span-4 lg:items-start">
            <div className="relative">
              <div className="flex h-36 w-28 md:h-52 md:w-40 items-center justify-center border-2 border-gray-900 dark:border-white"
                style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
                <span className="text-5xl md:text-7xl font-black" style={{ color }}>{initials}</span>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-[#c91f41] p-3 text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          <div className="col-span-12 flex flex-col justify-center gap-4 lg:col-span-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c91f41]">
                {profile.department?.name || "No Department"} / {getRoleLabel(profile.role)}
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase leading-none tracking-tight text-gray-900 dark:text-white">{profile.name}</h2>
            </div>
            <div className="mt-2 md:mt-4 flex flex-wrap gap-4 md:gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Department</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{profile.department?.name || "Unassigned"}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Status</span>
                <span className="text-sm font-bold text-[#c91f41]">● Active</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">Joined</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-black/40">
        <div className="flex items-center overflow-x-auto custom-scrollbar gap-1 whitespace-nowrap px-6">
          {[
            { key: "personal", label: "Personal" },
            { key: "job", label: "Job" },
            { key: "time-off", label: "Time Off" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "py-4 px-4 text-sm font-bold transition-all border-t-4 -mt-[1px]",
                activeTab === tab.key
                  ? "bg-gray-50 dark:bg-white/5 border-[#c91f41] text-[#c91f41]"
                  : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-auto py-4 px-4 text-sm font-bold text-red-500 hover:text-red-700 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "personal" && (
        <div className="space-y-10 py-8">
          {/* Basic Information */}
          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Employment Date</span>
                <input type="date" value={personalInfo.employmentDate} onChange={(e) => setPersonalInfo({ ...personalInfo, employmentDate: e.target.value })} className={inputClass} />
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Marital Status</span>
                <select value={personalInfo.maritalStatus} onChange={(e) => setPersonalInfo({ ...personalInfo, maritalStatus: e.target.value })} className={cn(inputClass, "appearance-none")}>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Gender</span>
                <select value={personalInfo.gender} onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })} className={cn(inputClass, "appearance-none")}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Phone Number</span>
                <input type="tel" value={personalInfo.phoneNumber} onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })} placeholder="e.g. +27 82 123 4567" className={inputClass} />
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Date of Birth</span>
                <input type="date" value={personalInfo.dateOfBirth} onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })} className={inputClass} />
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Address</span>
                <input type="text" value={personalInfo.address} onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })} placeholder="Home address" className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSavePersonal} disabled={savingPersonal} className="px-6 py-2 bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-[0.14em] rounded-lg hover:bg-[#a81a36] disabled:opacity-50 transition-all">
                {savingPersonal ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Security</h3>
              {!showPasswordForm && (
                <button onClick={() => setShowPasswordForm(true)} className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41] hover:bg-[#c91f41]/10 px-3 py-1.5 rounded-lg transition-all">
                  Change Password
                </button>
              )}
            </div>
            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Current Password</label>
                  <div className="relative">
                    <input type={showOldPw ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className={cn(inputClass, "pr-10")} />
                    <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c91f41]">
                      {showOldPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">New Password</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className={cn(inputClass, "pr-10")} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c91f41]">
                      {showNewPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={changingPw} className="px-6 py-2 bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-[0.14em] rounded-lg hover:bg-[#a81a36] disabled:opacity-50 transition-all">
                    {changingPw ? "Updating..." : "Update Password"}
                  </button>
                  <button type="button" onClick={() => setShowPasswordForm(false)} className="px-6 py-2 border border-gray-200 dark:border-white/10 text-gray-500 text-[10px] font-black uppercase tracking-[0.14em] rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Emergency Contact */}
          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Emergency Contact</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Contact Name</span>
                <input type="text" value={personalInfo.emergencyContactName} onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContactName: e.target.value })} placeholder="Full name" className={inputClass} />
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Phone Number</span>
                <input type="tel" value={personalInfo.emergencyContactPhone} onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContactPhone: e.target.value })} placeholder="+27 82 123 4567" className={inputClass} />
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Relationship</span>
                <select value={personalInfo.emergencyContactRelation} onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContactRelation: e.target.value })} className={cn(inputClass, "appearance-none")}>
                  <option value="">Select</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* Personal Documents */}
          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Personal Documents</h3>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">{documents.length} files</span>
                <button onClick={() => setShowUploadForm(!showUploadForm)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41] hover:bg-[#c91f41]/10 px-3 py-1.5 rounded-lg transition-all">
                  {showUploadForm ? "Cancel" : "+ Add Document"}
                </button>
              </div>
            </div>

            {showUploadForm && (
              <div className="rounded-2xl border border-[#c91f41]/20 bg-[#c91f41]/5 p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document name" className="h-10 px-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all" />
                  <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://example.com/document.pdf" className="h-10 px-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all" />
                  <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="h-10 px-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#c91f41] transition-all appearance-none">
                    <option value="Contract">Contract</option>
                    <option value="Identification">Identification</option>
                    <option value="Legal">Legal</option>
                    <option value="General">General</option>
                  </select>
                  <select value={docAccessLevel} onChange={(e) => setDocAccessLevel(e.target.value)} className="h-10 px-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#c91f41] transition-all appearance-none">
                    <option value="Restricted">Restricted</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Internal">Internal</option>
                  </select>
                </div>
                <button onClick={handleUpload} disabled={uploading || !docName.trim() || !docUrl.trim()} className="h-10 px-6 bg-[#c91f41] text-white rounded-lg text-[10px] font-black uppercase tracking-[0.14em] hover:bg-[#a81a36] disabled:opacity-40 transition-all">
                  {uploading ? "Uploading..." : "Add Document"}
                </button>
              </div>
            )}

            {documents.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-black/40">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-900 dark:border-white text-left">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500 w-[35%]">Document Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500 w-[15%]">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500 w-[15%]">Uploaded</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500 w-[15%]">Access</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500 text-right w-[20%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 group">
                        <td className="px-6 py-4">
                          {editingDocId === doc.id ? (
                            <input value={editDocName} onChange={(e) => setEditDocName(e.target.value)} className="w-full h-8 px-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#c91f41] transition-all" />
                          ) : (
                            <div className="flex items-center gap-3">
                              <svg className="h-5 w-5 text-[#c91f41] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingDocId === doc.id ? (
                            <select value={editDocCategory} onChange={(e) => setEditDocCategory(e.target.value)} className="h-8 px-2 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none appearance-none">
                              <option value="Contract">Contract</option>
                              <option value="Identification">Identification</option>
                              <option value="Legal">Legal</option>
                              <option value="General">General</option>
                            </select>
                          ) : (
                            <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300 px-3 py-1 rounded-full text-[10px] font-black uppercase">{doc.category}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          {editingDocId === doc.id ? (
                            <select value={editDocAccessLevel} onChange={(e) => setEditDocAccessLevel(e.target.value)} className="h-8 px-2 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none appearance-none">
                              <option value="Restricted">Restricted</option>
                              <option value="Confidential">Confidential</option>
                              <option value="Internal">Internal</option>
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", doc.accessLevel === "Confidential" ? "bg-red-500" : doc.accessLevel === "Restricted" ? "bg-amber-500" : "bg-emerald-500")} />
                              <span className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-zinc-400">{doc.accessLevel}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingDocId === doc.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setEditingDocId(null)} className="h-7 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Cancel</button>
                              <button onClick={() => handleUpdateDoc(doc.id)} className="h-7 px-3 rounded-lg bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#a81a36] transition-all">Save</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 relative">
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 flex items-center justify-center rounded-lg opacity-30 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-[#c91f41] transition-all" title="Download">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </a>
                              <div className="relative">
                                <button onClick={() => setOpenDropdownId(openDropdownId === doc.id ? null : doc.id)} className="h-8 w-8 flex items-center justify-center rounded-lg opacity-30 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                                </button>
                                {openDropdownId === doc.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 py-1">
                                    <button onClick={() => { setEditingDocId(doc.id); setEditDocName(doc.name); setEditDocCategory(doc.category); setEditDocAccessLevel(doc.accessLevel); setOpenDropdownId(null); }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2">
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      Update
                                    </button>
                                    <button onClick={() => handleDeleteDoc(doc.id)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2">
                                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Company Items */}
          {companyItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Company Items Owned</h3>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-black/40">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-900 dark:border-white text-left">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Item Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Category</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Serial Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-[#c91f41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400">{item.category || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400">{item.serialNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "job" && (
        <div className="space-y-10 py-8">
          <section className="grid grid-cols-12 gap-10">
            <div className="col-span-12 space-y-6 lg:col-span-7">
              <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Performance Metrics</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">All Time</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Completed Tasks</span>
                  <span className="text-4xl font-black text-[#c91f41]">{completedTasks.toLocaleString()}</span>
                  <div className="h-1 w-full overflow-hidden bg-gray-200 dark:bg-white/10">
                    <div className="h-full bg-[#c91f41]" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-6 space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Active Queue</span>
                  <span className="text-4xl font-black text-gray-900 dark:text-white">{activeTasks}</span>
                  <div className="h-1 w-full overflow-hidden bg-gray-200 dark:bg-white/10">
                    <div className="h-full bg-gray-900 dark:bg-white" style={{ width: totalTasks > 0 ? `${Math.round((activeTasks / totalTasks) * 100)}%` : "0%" }} />
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-gray-900 p-8 text-white">
                <div className="relative z-10 space-y-2">
                  <h4 className="text-xl font-black tracking-tight">Task Completion Rate</h4>
                  <p className="max-w-sm text-sm opacity-70">Based on all assigned tasks across projects and departments.</p>
                  <div className="flex items-center gap-6 pt-4">
                    <span className="text-5xl font-black text-[#c91f41]">{completionRate}%</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.14em] opacity-50">
                        <span>0%</span><span>Target: 80%</span><span>100%</span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full rounded-full bg-[#c91f41]" style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border-[20px] border-[#c91f41]/10" />
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "time-off" && (
        <div className="space-y-10 py-8">
          <section className="space-y-6">
            <div className="flex items-end justify-between border-b-2 border-gray-900 dark:border-white pb-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Leave Balance</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c91f41]">{new Date().getFullYear()}</span>
            </div>
            <div className="space-y-8 border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-black/40">
              {leaveBalances.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500">No leave types available for your profile.</p>
              ) : (
                leaveBalances.map((lb) => (
                  <div key={lb.type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{lb.label}</span>
                      <div className="flex items-center gap-3">
                        {editingLeaveType === lb.type ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={overrideDays}
                              onChange={(e) => setOverrideDays(e.target.value)}
                              className="w-20 h-8 px-2 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-[#c91f41] transition-all"
                              min="0"
                            />
                            <button onClick={() => handleOverrideLeave(lb.type)} className="h-8 px-3 rounded-lg bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#a81a36] transition-all">Save</button>
                            <button onClick={() => { setEditingLeaveType(null); setOverrideDays(""); }} className="h-8 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-[0.14em]">{lb.used} / {lb.allowed} DAYS</span>
                            {isHr && (
                              <button
                                onClick={() => { setEditingLeaveType(lb.type); setOverrideDays(String(lb.allowed)); }}
                                className="h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider text-[#c91f41] hover:bg-[#c91f41]/10 transition-all"
                                title="Adjust days"
                              >
                                Adjust
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <div className={cn("h-full rounded-full transition-all duration-1000", lb.color)} style={{ width: `${lb.percentage}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
