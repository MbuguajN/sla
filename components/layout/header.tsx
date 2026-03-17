"use client";

import { signOut } from "next-auth/react";
import { Moon02Icon, Sun01Icon, Search01Icon, Logout01Icon } from "hugeicons-react";
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
    <header className="h-20 sticky top-0 z-20 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-100 px-10">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl group">
        <div className="relative w-full">
          <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#c91f41] transition-colors" />
          <input
            type="text"
            placeholder="Search projects, tasks, or files..."
            className="w-full h-11 pl-12 pr-4 bg-gray-50 border-transparent rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-[#fff1f2] transition-all outline-none"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
        >
          {isDark ? <Sun01Icon className="h-5 w-5" /> : <Moon02Icon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* User avatar */}
        <div className="relative border-l border-gray-100 pl-4 ml-2">
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
              <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white shadow-2xl shadow-gray-200/50 border border-gray-100 p-2 z-20 overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-4 mb-1">
                  <p className="text-sm font-black text-gray-900 leading-tight">{user.name}</p>
                  <p className="text-[11px] font-bold text-gray-400 truncate uppercase mt-0.5 tracking-wider">{user.role}</p>
                </div>
                <div className="h-px bg-gray-50 mx-2 mb-1" />
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
