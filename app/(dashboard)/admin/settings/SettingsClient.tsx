"use client";

import { useState, useRef } from "react";
import { updateSystemSetting, uploadLogo } from "@/app/actions/adminActions";
import { 
  Settings02Icon, 
  PlusSignIcon, 
  Image01Icon, 
  Sun01Icon, 
  Moon02Icon, 
  Upload01Icon, 
  Tick02Icon,
  InformationCircleIcon,
  Shield02Icon,
  SecurityCheckIcon,
  Cancel01Icon
} from "hugeicons-react";
import { cn } from "@/lib/utils";

type Setting = {
  id: number;
  key: string;
  value: string;
};

interface Props {
  initialSettings: Setting[];
  initialLogos: { light: string | null; dark: string | null };
}

const defaultSettings = [
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "default_sla_hours", label: "Default SLA Hours", type: "number" },
  { key: "max_leave_days_annual", label: "Max Annual Leave Days", type: "number" },
];

export default function SettingsClient({ initialSettings, initialLogos }: Props) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [logos, setLogos] = useState(initialLogos);
  
  const [tempLightLogo, setTempLightLogo] = useState<File | null>(null);
  const [tempDarkLogo, setTempDarkLogo] = useState<File | null>(null);
  const [lightPreview, setLightPreview] = useState<string | null>(initialLogos.light);
  const [darkPreview, setDarkPreview] = useState<string | null>(initialLogos.dark);

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

  const getValue = (key: string) => settings.find((s) => s.key === key)?.value || "";

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      const result = await updateSystemSetting(key, value);
      setSettings((prev) => {
        const exists = prev.find((s) => s.key === key);
        if (exists) {
          return prev.map((s) => (s.key === key ? { ...s, value } : s));
        }
        return [...prev, { id: result.id, key, value }];
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: "light" | "dark") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (mode === "light") {
        setTempLightLogo(file);
        setLightPreview(reader.result as string);
      } else {
        setTempDarkLogo(file);
        setDarkPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBulkLogoSave = async () => {
    if (!tempLightLogo && !tempDarkLogo) return;

    setUploadingLogos(true);
    try {
      if (tempLightLogo) {
        const lightData = new FormData();
        lightData.append("file", tempLightLogo);
        const res = await uploadLogo(lightData, "light");
        setLogos(p => ({ ...p, light: res.logoPath }));
        setTempLightLogo(null);
      }

      if (tempDarkLogo) {
        const darkData = new FormData();
        darkData.append("file", tempDarkLogo);
        const res = await uploadLogo(darkData, "dark");
        setLogos(p => ({ ...p, dark: res.logoPath }));
        setTempDarkLogo(null);
      }

      alert("Logos saved successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogos(false);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-base-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
              <Settings02Icon className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Admin Control</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-base-content">System <span className="text-rose-500">Settings</span></h1>
          <p className="text-base-content/50 mt-2 font-medium">Configure global parameters and branding for the entire platform.</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary rounded-2xl px-6 h-14"
        >
          <PlusSignIcon className="w-5 h-5" />
          Add Custom Field
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding & Visuals Card */}
        <div className="card bg-base-100 shadow-xl border border-base-200 overflow-visible">
          <div className="card-body p-8">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-[#fff1f3] flex items-center justify-center rounded-2xl">
                <Image01Icon className="w-8 h-8 text-[#f43f5e]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold tracking-tight text-[#111827]">Company Branding</h2>
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-[0.2em] mt-1">Visual Identity</span>
              </div>
            </div>

            <div className="px-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                {/* Light Mode Logo */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Sun01Icon className="w-5 h-5 text-[#f59e0b]" />
                    <span className="text-[15px] font-semibold text-[#374151]">Light Mode</span>
                  </div>
                  
                  <div 
                    onClick={() => lightInputRef.current?.click()}
                    className={cn(
                      "group relative h-56 rounded-[2.5rem] border border-[#f3f4f6] bg-white transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
                      "hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]",
                      !lightPreview && "border-2 border-dashed border-[#e5e7eb] bg-transparent shadow-none"
                    )}
                  >
                    {lightPreview ? (
                      <div className="p-8 w-full h-full flex items-center justify-center">
                        <img src={lightPreview} alt="Light preview" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <Upload01Icon className="w-8 h-8 text-[#f43f5e]" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full border border-[#f3f4f6] flex items-center justify-center bg-white shadow-sm">
                          <Upload01Icon className="w-6 h-6 text-[#9ca3af]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#9ca3af] uppercase tracking-widest">Select Image</span>
                      </div>
                    )}
                    <input ref={lightInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "light")} />
                  </div>
                </div>

                {/* Dark Mode Logo */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Moon02Icon className="w-5 h-5 text-[#6366f1]" />
                    <span className="text-[15px] font-semibold text-[#374151]">Dark Mode</span>
                  </div>

                  <div 
                    onClick={() => darkInputRef.current?.click()}
                    className={cn(
                      "group relative h-56 rounded-[2.5rem] border border-[#e5e7eb] bg-[#f3f4f6] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 shadow-sm",
                      "hover:bg-[#ebedf0]",
                      !darkPreview && "border-2 border-dashed border-[#d1d5db] bg-[#e5e7eb] shadow-none"
                    )}
                  >
                    {darkPreview ? (
                      <div className="p-8 w-full h-full flex items-center justify-center">
                        <img src={darkPreview} alt="Dark preview" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <Upload01Icon className="w-8 h-8 text-[#111827]" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full border border-[#d1d5db] flex items-center justify-center bg-[#f3f4f6] shadow-sm">
                          <Upload01Icon className="w-6 h-6 text-[#9ca3af]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#9ca3af] uppercase tracking-widest">Select Image</span>
                      </div>
                    )}
                    <input ref={darkInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "dark")} />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-10 mt-10 border-t border-[#f3f4f6] flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase leading-relaxed tracking-wider max-w-[220px]">
                  Images are optimized for high-density displays automatically.
                </p>
                <button 
                  onClick={handleBulkLogoSave}
                  disabled={uploadingLogos || (!tempLightLogo && !tempDarkLogo)}
                  className="btn bg-white hover:bg-[#fff1f3] text-[#111827] border border-[#f3f4f6] shadow-[0_4px_14px_0_rgba(244,63,94,0.15)] rounded-3xl h-14 px-10 transition-all font-semibold flex items-center gap-3 active:scale-95 group disabled:opacity-50"
                >
                  {uploadingLogos ? (
                    <span className="loading loading-spinner text-[#f43f5e]"></span>
                  ) : (
                    <>
                      <Tick02Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      Save Branding
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Configuration Card */}
        <div className="card bg-base-100 shadow-xl border border-base-200 h-fit">
          <div className="card-body p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/10 rounded-2xl">
                <InformationCircleIcon className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h2 className="card-title text-2xl font-black tracking-tight">System Info</h2>
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Support & Meta</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="form-control">
                <label className="label mb-1">
                  <span className="label-text font-black text-sm opacity-70 uppercase tracking-wider">Support Email Address</span>
                </label>
                <div className="join w-full shadow-sm ring-1 ring-base-200 rounded-2xl overflow-hidden focus-within:ring-rose-500/30 transition-all">
                  <input
                    type="email"
                    placeholder="support@company.com"
                    defaultValue={getValue("support_email")}
                    className="input bg-base-200/30 border-none join-item w-full h-14 px-6 text-base font-medium focus:outline-none"
                    id="support_email"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("support_email") as HTMLInputElement;
                      handleSave("support_email", input.value);
                    }}
                    disabled={saving === "support_email"}
                    className="btn btn-primary join-item px-8 h-14 rounded-none border-none"
                  >
                    {saving === "support_email" ? <span className="loading loading-spinner loading-xs"></span> : "Save"}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-base-200/50 rounded-[2rem] border border-base-300/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield02Icon className="w-24 h-24" />
                </div>
                <h4 className="font-black text-sm mb-2 opacity-80 flex items-center gap-2">
                  <SecurityCheckIcon className="w-4 h-4 text-rose-500" />
                  Security Notice
                </h4>
                <p className="text-xs font-medium opacity-50 leading-relaxed pr-12">
                  Changes to system branding and support emails are logged for security audits. These settings impact the login screen and system-generated notifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings List */}
      <div className="card bg-base-100 shadow-xl border border-base-200 divide-y divide-base-200 overflow-hidden rounded-[2.5rem]">
        {settings.length > 0 ? (
          settings.map((setting) => (
            <SettingRow
              key={setting.key}
              label={setting.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              settingKey={setting.key}
              value={setting.value}
              type="text"
              saving={saving === setting.key}
              onSave={handleSave}
            />
          ))
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto opacity-20">
              <Settings02Icon className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold opacity-30 uppercase tracking-widest">No custom settings configured</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddSettingModal
          onClose={() => setShowAddModal(false)}
          onAdd={(key, value) => {
            handleSave(key, value);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function SettingRow({
  label,
  settingKey,
  value,
  type,
  saving,
  onSave,
}: {
  label: string;
  settingKey: string;
  value: string;
  type: string;
  saving: boolean;
  onSave: (key: string, value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);
  const hasChanges = localValue !== value;

  return (
    <div className="flex items-center justify-between p-6 hover:bg-base-200/50 transition-colors">
      <div className="flex-1">
        <p className="font-black text-sm tracking-tight text-base-content">{label}</p>
        <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest">{settingKey}</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="w-64 h-12 px-5 bg-base-200/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500/20 focus:bg-base-100 transition-all font-mono"
        />
        <button
          onClick={() => onSave(settingKey, localValue)}
          disabled={!hasChanges || saving}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
            hasChanges 
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95" 
              : "bg-base-200 text-base-content/20 scale-95 opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Tick02Icon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

function AddSettingModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (key: string, value: string) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key && value) {
      onAdd(key, value);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-base-300/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-base-100 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-base-200">
        <div className="p-8 border-b border-base-200 flex items-center justify-between bg-base-200/20">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Add Setting</h2>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Metadata Configuration</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-3 text-base-content/30 hover:text-base-content hover:bg-base-200 rounded-2xl transition-all"
          >
            <Cancel01Icon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="form-control w-full">
            <label className="label mb-1">
              <span className="label-text font-black text-xs uppercase tracking-widest opacity-50">Setting Key</span>
            </label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="e.g. custom_setting"
              className="input bg-base-200/50 border-none rounded-2xl h-14 font-medium focus:ring-2 focus:ring-rose-500/20 px-6"
            />
          </div>

          <div className="form-control w-full">
            <label className="label mb-1">
              <span className="label-text font-black text-xs uppercase tracking-widest opacity-50">Value</span>
            </label>
            <input
              type="text"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value..."
              className="input bg-base-200/50 border-none rounded-2xl h-14 font-medium focus:ring-2 focus:ring-rose-500/20 px-6"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1 bg-base-200 border-none hover:bg-base-300 text-base-content rounded-2xl h-14 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn flex-1 btn-primary border-none rounded-2xl h-14 shadow-lg shadow-rose-500/20 font-bold"
            >
              <Tick02Icon className="w-5 h-5" />
              Add Setting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
