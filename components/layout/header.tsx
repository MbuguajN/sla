"use client";

import { signOut } from "next-auth/react";
import { Moon02Icon, Sun01Icon, Logout01Icon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import NotificationDropdown from "./NotificationDropdown";
import { addPlatformLink, deletePlatformLink } from "@/app/actions/platformActions";
import { Globe, Plus, X, Trash2, ExternalLink, Loader2, Search } from "lucide-react";

interface PlatformLinkItem {
  id: number;
  name: string;
  url: string;
  favicon: string | null;
}

interface HeaderProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    departmentSlug: string | null;
  };
  platformLinks: PlatformLinkItem[];
  isAdmin: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getWeatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear", emoji: "☀️" };
  if (code <= 2) return { label: "Mainly Clear", emoji: "🌤️" };
  if (code === 3) return { label: "Overcast", emoji: "☁️" };
  if (code <= 48) return { label: "Foggy", emoji: "🌫️" };
  if (code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code <= 67) return { label: "Rain", emoji: "🌧️" };
  if (code <= 77) return { label: "Snow", emoji: "❄️" };
  if (code <= 82) return { label: "Showers", emoji: "🌦️" };
  if (code <= 86) return { label: "Snow Showers", emoji: "🌨️" };
  return { label: "Storm", emoji: "⛈️" };
}

function WeatherWidget() {
  const [weather, setWeather] = useState<{
    temp: number;
    weathercode: number;
    city: string;
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { headers: { "Accept-Language": "en" } }
            ),
          ]);
          const [weatherData, geoData] = await Promise.all([
            weatherRes.json(),
            geoRes.json(),
          ]);
          setWeather({
            temp: Math.round(weatherData.current_weather.temperature),
            weathercode: weatherData.current_weather.weathercode,
            city:
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              "",
          });
        } catch {
          // silently fail — weather is non-critical
        }
      },
      () => {}
    );
  }, []);

  if (!weather) return null;

  const { label, emoji } = getWeatherInfo(weather.weathercode);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{weather.temp}°C</span>
      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">{label}</span>
      {weather.city && (
        <>
          <span className="text-gray-300 dark:text-zinc-700">·</span>
          <span className="text-xs font-bold text-gray-400 dark:text-zinc-600 max-w-[90px] truncate">
            {weather.city}
          </span>
        </>
      )}
    </div>
  );
}

function getUserColor(userId: number, name: string) {
  if (!name) return "bg-zinc-500 text-white";
  if (name.toLowerCase().includes("admin") || userId === 1 || userId === 9999) {
    return "bg-[#c91f41] text-white";
  }
  const colors = [
    "bg-sky-500 text-white",
    "bg-emerald-500 text-white",
    "bg-amber-500 text-white",
    "bg-indigo-500 text-white",
    "bg-fuchsia-500 text-white",
    "bg-cyan-500 text-white",
    "bg-rose-500 text-white",
    "bg-teal-500 text-white"
  ];
  return colors[userId % colors.length];
}

function getDomainFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const LINK_COLORS = [
  "bg-sky-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-fuchsia-500 text-white",
  "bg-cyan-500 text-white",
  "bg-rose-500 text-white",
  "bg-teal-500 text-white",
];

function getLinkColor(id: number): string {
  return LINK_COLORS[id % LINK_COLORS.length];
}

function FaviconImg({ url, name, id }: { url: string; name: string; id: number }) {
  const [failed, setFailed] = useState(false);
  const favicon = getDomainFavicon(url);

  if (!favicon || failed) {
    return (
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0", getLinkColor(id))}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={favicon}
      alt=""
      className="h-8 w-8 rounded-lg object-contain bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 p-1 shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

function PreviewFavicon({ url, name, id }: { url: string; name: string; id: number }) {
  const [failed, setFailed] = useState(false);
  const favicon = getDomainFavicon(url);

  if (!favicon || failed) {
    return (
      <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-black mb-4 shadow-lg", getLinkColor(id))}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={favicon}
      alt=""
      className="h-16 w-16 rounded-2xl object-contain bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 shadow-lg p-2 mb-4"
      onError={() => setFailed(true)}
    />
  );
}

function getDomainName(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export default function Header({ user, platformLinks: initialLinks, isAdmin }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [previewLink, setPreviewLink] = useState<PlatformLinkItem | null>(null);
  const [platformLinks, setPlatformLinks] = useState<PlatformLinkItem[]>(initialLinks);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [platformSearch, setPlatformSearch] = useState("");
  const platformsRef = useRef<HTMLDivElement>(null);
  const addLinkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (platformsRef.current && !platformsRef.current.contains(target)) {
        setShowPlatforms(false);
        setShowAddLink(false);
      }
      if (addLinkRef.current && !addLinkRef.current.contains(target)) {
        setShowAddLink(false);
      }
    };
    if (showPlatforms) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlatforms]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const handleAddLink = async () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    setAddingLink(true);
    try {
      const link = await addPlatformLink(newLinkName.trim(), newLinkUrl.trim());
      setPlatformLinks((prev) => [{ id: link.id, name: link.name, url: link.url, favicon: link.favicon }, ...prev]);
      setNewLinkName("");
      setNewLinkUrl("");
      setShowAddLink(false);
    } catch (err: any) {
      alert(err.message || "Failed to add link");
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (id: number) => {
    if (!confirm("Remove this platform link?")) return;
    try {
      await deletePlatformLink(id);
      setPlatformLinks((prev) => prev.filter((l) => l.id !== id));
      if (previewLink?.id === id) setPreviewLink(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete link");
    }
  };

  return (
    <header className="h-20 sticky top-0 z-20 flex items-center justify-between bg-white/80 dark:bg-black/90 backdrop-blur-md border-b border-gray-100 dark:border-white/10 px-10">
      {/* Greeting + Header Widgets */}
      <div className="flex items-center gap-4 flex-1">
        <div>
          <p className="text-sm font-black text-gray-900 dark:text-white">
            {getGreeting()}, {user.name?.split(" ")[0] ?? "User"}
          </p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest">
            Welcome back
          </p>
        </div>
        <WeatherWidget />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Platforms dropdown */}
        <div className="relative" ref={platformsRef}>
          <button
            onClick={() => { setShowPlatforms(!showPlatforms); setShowAddLink(false); }}
            className={cn(
              "h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all border",
              showPlatforms
                ? "bg-[#c91f41] text-white border-[#c91f41] shadow-lg shadow-[#c91f41]/20"
                : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:border-[#c91f41]/30 hover:text-[#c91f41] dark:hover:text-white"
            )}
          >
            <Globe className="h-4 w-4" />
            Platforms
          </button>

          {showPlatforms && (
            <div className="absolute top-full right-0 mt-2 w-[420px] bg-white dark:bg-[#111111] rounded-2xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.25)] dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-white/15 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 dark:border-white/15">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Platforms</h3>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest mt-0.5">
                      {platformLinks.length} linked {platformLinks.length === 1 ? "site" : "sites"}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddLink(!showAddLink)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                        showAddLink
                          ? "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-zinc-300"
                          : "bg-[#c91f41] text-white hover:bg-[#a01832]"
                      )}
                    >
                      {showAddLink ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {showAddLink ? "Cancel" : "Add"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-600" />
                  <input
                    autoFocus
                    value={platformSearch}
                    onChange={(e) => setPlatformSearch(e.target.value)}
                    placeholder="Search platforms..."
                    className="w-full h-9 pl-9 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                  />
                </div>
              </div>

              {/* Add link form */}
              {showAddLink && isAdmin && (
                <div ref={addLinkRef} className="px-5 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                      placeholder="Platform name"
                      className="w-full h-10 px-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                    />
                    <input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full h-10 px-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                    />
                    <button
                      onClick={handleAddLink}
                      disabled={!newLinkName.trim() || !newLinkUrl.trim() || addingLink}
                      className="w-full h-10 bg-[#c91f41] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#a01832] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {addingLink && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {addingLink ? "Adding..." : "Add Platform"}
                    </button>
                  </div>
                </div>
              )}

              {/* Links list + preview */}
              <div className="flex max-h-[400px]">
                {/* Links list */}
                <div className={cn("flex-1 overflow-y-auto transition-all duration-200", previewLink ? "w-[180px]" : "")}>
                  {platformLinks.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <Globe className="h-8 w-8 text-gray-200 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-600">No platforms yet</p>
                      {isAdmin && (
                        <p className="text-[10px] font-bold text-gray-300 dark:text-zinc-700 mt-1">
                          Click + Add to get started
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-1.5">
                      {platformLinks
                        .filter((l) => {
                          if (!platformSearch.trim()) return true;
                          const q = platformSearch.toLowerCase();
                          return l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q);
                        })
                        .slice(0, 5)
                        .map((link) => {
                          const isActive = previewLink?.id === link.id;
                          return (
                            <div
                              key={link.id}
                              className={cn(
                                "group flex items-center gap-3 px-5 py-3 cursor-pointer transition-all",
                                isActive
                                  ? "bg-[#c91f41]/5 dark:bg-[#c91f41]/10"
                                  : "hover:bg-gray-50 dark:hover:bg-white/5"
                              )}
                              onMouseEnter={() => setPreviewLink(link)}
                            >
                              <FaviconImg url={link.url} name={link.name} id={link.id} />
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-bold truncate transition-colors",
                                  isActive ? "text-[#c91f41]" : "text-gray-900 dark:text-white"
                                )}>
                                  {link.name}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 truncate">
                                  {getDomainName(link.url)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-sky-500 transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteLink(link.id); }}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {(() => {
                        const filtered = platformLinks.filter((l) => {
                          if (!platformSearch.trim()) return true;
                          const q = platformSearch.toLowerCase();
                          return l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q);
                        });
                        if (filtered.length === 0 && platformSearch.trim()) {
                          return (
                            <div className="px-5 py-8 text-center">
                              <Search className="h-6 w-6 text-gray-200 dark:text-zinc-700 mx-auto mb-2" />
                              <p className="text-xs font-bold text-gray-400 dark:text-zinc-600">No matches for &quot;{platformSearch}&quot;</p>
                            </div>
                          );
                        }
                        if (filtered.length > 5) {
                          return (
                            <div className="px-5 py-2 text-center">
                              <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600">
                                +{filtered.length - 5} more
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Preview panel - only on hover */}
                {previewLink && (
                  <div
                    className="w-[240px] flex flex-col bg-gray-50 dark:bg-white/[0.02] border-l border-gray-200 dark:border-white/15 animate-in fade-in duration-150"
                    onMouseLeave={() => setPreviewLink(null)}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      {/* Large favicon / initials fallback */}
                      <PreviewFavicon url={previewLink.url} name={previewLink.name} id={previewLink.id} />

                      {/* Site name */}
                      <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">{previewLink.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest mb-1">{getDomainName(previewLink.url)}</p>

                      {/* Color accent bar */}
                      <div className="w-12 h-1 rounded-full bg-gradient-to-r from-[#c91f41] to-pink-400 my-4" />

                      {/* URL preview */}
                      <div className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-white/10 mb-4 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-widest mb-1">Website</p>
                        <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate">{previewLink.url}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 w-full">
                        <a
                          href={previewLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#c91f41] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#a01832] transition-colors shadow-lg shadow-[#c91f41]/20"
                        >
                          Open Site
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-transparent dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20"
        >
          {isDark ? <Sun01Icon className="h-5 w-5" /> : <Moon02Icon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* User avatar */}
        <div className="relative border-l border-gray-100 dark:border-white/10 pl-4 ml-2">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 border border-white shadow-sm ring-1 ring-[#c91f41]/5 overflow-hidden",
              getUserColor(user.id, user.name)
            )}
          >
            <span className="text-sm font-black text-inherit">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </span>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white dark:bg-[#111111] shadow-2xl shadow-gray-200/50 dark:shadow-black/60 border border-gray-100 dark:border-white/10 p-2 z-20 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-4 mb-1">
                  <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{user.name}</p>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 truncate uppercase mt-0.5 tracking-wider">{user.role}</p>
                </div>
                <div className="h-px bg-gray-50 dark:bg-white/10 mx-2 mb-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-200"
                >
                  <Logout01Icon className="h-4 w-4 stroke-[2.5]" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
