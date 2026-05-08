"use client";

import { signOut } from "next-auth/react";
import { Moon02Icon, Sun01Icon, Logout01Icon } from "hugeicons-react";
import { useState, useEffect } from "react";
import NotificationDropdown from "./NotificationDropdown";

interface HeaderProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    departmentSlug: string | null;
  };
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

export default function Header({ user }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
      <div className="flex items-center gap-4">
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
            className="w-10 h-10 rounded-2xl bg-[#fff1f2] flex items-center justify-center hover:bg-[#ffe4e6] transition-all duration-300 border border-white shadow-sm ring-1 ring-[#c91f41]/5 overflow-hidden"
          >
            <span className="text-[#c91f41] text-sm font-black">
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
