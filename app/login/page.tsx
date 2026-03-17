"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, Sun, Moon } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-base-200">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#c91f41]/6 blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#c91f41]/4/4 blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 p-2.5 rounded-xl bg-base-100/80 backdrop-blur-xl border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-100 transition-all duration-200 z-10 shadow-sm"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Login card */}
      <div className="w-full max-w-[420px] mx-4 relative z-10 rounded-3xl border border-base-300 bg-base-100/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#c91f41] via-[#e8365b] to-transparent" />

        <div className="px-8 pt-8 pb-8">
          {/* Logo */}
          <div className="mb-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#c91f41] flex items-center justify-center shadow-xl shadow-[#c91f41]/25 mb-4">
              <span className="text-xl font-black text-white">5D</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-base-content">
              Welcome back
            </h1>
            <p className="text-sm text-base-content/50 mt-1.5">
              Sign in to Operations Control
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-[#c91f41]/8 border border-[#c91f41]/20 text-[#c91f41] text-sm text-center flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c91f41] animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-base-content/70">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-base-content/70">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold rounded-xl bg-[#c91f41] hover:bg-[#c91f41]/90 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-5 border-t border-base-300 text-center">
            <p className="text-xs text-base-content/35">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-10">
        <p className="text-xs text-base-content/30">
          5DM Operations Control Center
        </p>
      </div>
    </div>
  )
}
