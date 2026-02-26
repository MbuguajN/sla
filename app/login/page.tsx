'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const [logos, setLogos] = useState<{ light: string, dark: string }>({ light: '', dark: '' })

  useState(() => {
    import('../actions/settingsActions').then(mod => {
      mod.getSystemSettings(['SYSTEM_LOGO_LIGHT', 'SYSTEM_LOGO_DARK', 'SYSTEM_LOGO']).then((settings: any) => {
        setLogos({
          light: settings['SYSTEM_LOGO_LIGHT'] || settings['SYSTEM_LOGO'] || '/logo.svg',
          dark: settings['SYSTEM_LOGO_DARK'] || settings['SYSTEM_LOGO'] || '/logo.svg'
        })
      })
    }).catch(err => {
      console.error("Failed to load settings actions", err)
    })
  })

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 overflow-hidden">
            <img src={logos.light} alt="Logo" className="w-full h-full object-contain dark:hidden" />
            <img src={logos.dark} alt="Logo" className="w-full h-full object-contain hidden dark:block" />
          </div>
        </div>

        {/* Card */}
        <div className="card bg-base-100 shadow-lg border border-base-200 rounded-2xl overflow-hidden">
          <div className="card-body p-8 gap-6">

            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Sign In</h2>
              <p className="text-sm text-base-content/50">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="text-xs font-medium text-base-content/60">Email</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                  <input
                    required
                    type="email"
                    placeholder="you@company.com"
                    className="input input-bordered bg-base-100 w-full pl-10 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="text-xs font-medium text-base-content/60">Password</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered bg-base-100 w-full pl-10 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-error text-sm bg-error/10 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block shadow-sm border-none h-11 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-base-content/30 mt-6">
          5DM Operations Platform
        </p>
      </div>
    </div>
  )
}
