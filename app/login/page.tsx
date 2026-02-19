'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Activity, Lock, Mail, Loader2, AlertOctagon } from "lucide-react"

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

  // Fetch logo settings on mount
  const [logos, setLogos] = useState<{ light: string, dark: string }>({ light: '', dark: '' })

  useState(() => {
    import('@/app/actions/settingsActions').then(mod => {
      mod.getSystemSettings(['SYSTEM_LOGO_LIGHT', 'SYSTEM_LOGO_DARK', 'SYSTEM_LOGO']).then(settings => {
        setLogos({
          light: settings['SYSTEM_LOGO_LIGHT'] || settings['SYSTEM_LOGO'] || '/logo.svg',
          dark: settings['SYSTEM_LOGO_DARK'] || settings['SYSTEM_LOGO'] || '/logo.svg'
        })
      })
    })
  })

  // ... handleSubmit ...

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-base-200 to-base-200">
      <div className="max-w-md w-full animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-32 h-32 mb-8 overflow-hidden">
            <img
              src={logos.light}
              alt="Logo"
              className="w-full h-full object-contain dark:hidden"
            />
            <img
              src={logos.dark}
              alt="Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
        </div>

        <div className="card bg-base-100 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-base-content/5 rounded-[2.5rem] overflow-hidden">

          <div className="card-body p-12 gap-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-center uppercase">System Access</h2>
              <p className="text-center text-[10px] font-bold text-base-content/40 uppercase tracking-[0.3em]">Credentials Required</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control w-full">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    type="email"
                    placeholder="INTERNAL EMAIL"
                    className="input input-lg bg-base-200 border-none focus:ring-2 focus:ring-primary/20 w-full pl-12 transition-all font-bold text-xs tracking-wider"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    type="password"
                    placeholder="SECURITY KEY"
                    className="input input-lg bg-base-200 border-none focus:ring-2 focus:ring-primary/20 w-full pl-12 transition-all font-bold text-xs tracking-wider"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-error bg-error/10 text-error text-[10px] font-black uppercase tracking-widest border-none py-4 rounded-2xl">
                  <AlertOctagon className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block shadow-xl shadow-primary/20 rounded-2xl border-none hover:scale-[1.02] active:scale-95 transition-all h-16 group"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>ENTER OPERATIONAL HUB</span>}
              </button>
            </form>

            <div className="flex flex-col items-center gap-4 mt-4">
              <div className="h-px w-12 bg-base-content/10"></div>
              <p className="text-[9px] font-black text-base-content/30 uppercase tracking-[0.4em]">
                Secure Pipeline v0.1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
