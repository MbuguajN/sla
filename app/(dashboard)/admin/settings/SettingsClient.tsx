"use client";

import { useState, useRef } from "react";
import { uploadLogo, updateSystemSetting } from "@/app/actions/adminActions";
import { 
  Settings02Icon, 
  Image01Icon, 
  Sun01Icon, 
  Moon02Icon, 
  Upload01Icon, 
  Tick02Icon
} from "@hugeicons/react";
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

export default function SettingsClient({ initialSettings, initialLogos }: Props) {
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [, setLogos] = useState(initialLogos);
  const initialMinSlaSetting = initialSettings.find((setting) => setting.key === "task_sla_min_hours")?.value || "1";
  const [minSlaHours, setMinSlaHours] = useState(initialMinSlaSetting);
  const [savingMinSla, setSavingMinSla] = useState(false);
  
  const [tempLightLogo, setTempLightLogo] = useState<File | null>(null);
  const [tempDarkLogo, setTempDarkLogo] = useState<File | null>(null);
  const [lightPreview, setLightPreview] = useState<string | null>(initialLogos.light);
  const [darkPreview, setDarkPreview] = useState<string | null>(initialLogos.dark);

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveMinSla = async () => {
    const parsed = Number.parseInt(minSlaHours, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      alert("SLA minimum must be at least 1 hour.");
      return;
    }

    setSavingMinSla(true);
    try {
      await updateSystemSetting("task_sla_min_hours", String(parsed));
      setMinSlaHours(String(parsed));
      alert("SLA minimum updated successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update SLA minimum");
    } finally {
      setSavingMinSla(false);
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
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Branding & Visuals Card */}
        <div className="card bg-base-100 shadow-xl border border-base-200 overflow-visible">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-12 h-12 bg-[#fff1f3] flex items-center justify-center rounded-2xl">
                <Image01Icon className="w-6 h-6 text-[#f43f5e]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">Company Branding</h2>
                <span className="text-[10px] font-bold text-[#9ca3af] dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Visual Identity</span>
              </div>
            </div>

            <div className="px-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                {/* Light Mode Logo */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Sun01Icon className="w-4 h-4 text-[#f59e0b]" />
                    <span className="text-[11px] font-semibold text-[#374151] dark:text-zinc-200">Light Mode</span>
                  </div>
                  
                  <div 
                    onClick={() => lightInputRef.current?.click()}
                    className={cn(
                      "group relative h-44 rounded-[2rem] border border-[#f3f4f6] bg-white transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
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
                        <div className="w-12 h-12 rounded-full border border-[#f3f4f6] flex items-center justify-center bg-white shadow-sm">
                          <Upload01Icon className="w-5 h-5 text-[#9ca3af]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Select Image</span>
                      </div>
                    )}
                    <input ref={lightInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "light")} />
                  </div>
                </div>

                {/* Dark Mode Logo */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Moon02Icon className="w-4 h-4 text-[#6366f1]" />
                    <span className="text-[11px] font-semibold text-[#374151] dark:text-zinc-200">Dark Mode</span>
                  </div>

                  <div 
                    onClick={() => darkInputRef.current?.click()}
                    className={cn(
                      "group relative h-44 rounded-[2rem] border border-[#e5e7eb] dark:border-white/10 bg-[#f3f4f6] dark:bg-black transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 shadow-sm dark:shadow-none",
                      "hover:bg-[#ebedf0] dark:hover:bg-white/5",
                      !darkPreview && "border-2 border-dashed border-[#d1d5db] dark:border-white/20 bg-[#e5e7eb] dark:bg-black shadow-none"
                    )}
                  >
                    {darkPreview ? (
                      <div className="p-8 w-full h-full flex items-center justify-center">
                        <img src={darkPreview} alt="Dark preview" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/5 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <Upload01Icon className="w-8 h-8 text-[#111827] dark:text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full border border-[#d1d5db] dark:border-white/20 flex items-center justify-center bg-[#f3f4f6] dark:bg-white/5 shadow-sm dark:shadow-none">
                          <Upload01Icon className="w-5 h-5 text-[#9ca3af]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Select Image</span>
                      </div>
                    )}
                    <input ref={darkInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "dark")} />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-7 mt-7 border-t border-[#f3f4f6] flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#9ca3af] dark:text-zinc-500 uppercase leading-relaxed tracking-wider max-w-[220px]">
                  Images are optimized for high-density displays automatically.
                </p>
                <button 
                  onClick={handleBulkLogoSave}
                  disabled={uploadingLogos || (!tempLightLogo && !tempDarkLogo)}
                  className="btn bg-white dark:bg-black hover:bg-[#fff1f3] dark:hover:bg-white/5 text-[#111827] dark:text-zinc-100 border border-[#f3f4f6] dark:border-white/10 shadow-[0_4px_14px_0_rgba(244,63,94,0.15)] dark:shadow-none rounded-3xl h-11 px-7 transition-all text-xs font-semibold flex items-center gap-2 active:scale-95 group disabled:opacity-50"
                >
                  {uploadingLogos ? (
                    <span className="loading loading-spinner text-[#f43f5e]"></span>
                  ) : (
                    <>
                      <Tick02Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      Save Branding
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl border border-base-200 overflow-visible">
          <div className="card-body p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#fff1f3] flex items-center justify-center rounded-2xl">
                <Settings02Icon className="w-6 h-6 text-[#f43f5e]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">SLA Minimum</h2>
                <span className="text-[10px] font-bold text-[#9ca3af] dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                  Task Creation Guardrail
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[220px_auto] gap-6 items-end">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af] dark:text-zinc-500 mb-3 block">
                  Minimum SLA Hours
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={minSlaHours}
                  onChange={(e) => setMinSlaHours(e.target.value)}
                  className="w-full h-12 rounded-xl border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-black px-4 text-sm font-bold text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e]"
                />
                <p className="mt-2 text-[10px] font-semibold text-[#9ca3af] dark:text-zinc-500 uppercase tracking-wider">
                  New tasks cannot go below this value.
                </p>
              </div>

              <div className="flex items-center sm:justify-end">
                <button
                  onClick={handleSaveMinSla}
                  disabled={savingMinSla}
                  className="btn bg-white dark:bg-black hover:bg-[#fff1f3] dark:hover:bg-white/5 text-[#111827] dark:text-zinc-100 border border-[#f3f4f6] dark:border-white/10 shadow-[0_4px_14px_0_rgba(244,63,94,0.15)] dark:shadow-none rounded-3xl h-11 px-7 transition-all text-xs font-semibold flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {savingMinSla ? (
                    <span className="loading loading-spinner text-[#f43f5e]" />
                  ) : (
                    <>
                      <Tick02Icon className="w-4 h-4" />
                      Save SLA Minimum
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
