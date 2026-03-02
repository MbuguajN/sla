'use client'

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [logos, setLogos] = useState<{ light: string, dark: string }>({ light: '', dark: '' })

  useEffect(() => {
    import('../actions/settingsActions').then(mod => {
      mod.getSystemSettings(['SYSTEM_LOGO_LIGHT', 'SYSTEM_LOGO_DARK', 'SYSTEM_LOGO']).then((settings: any) => {
        setLogos({
          light: settings['SYSTEM_LOGO_LIGHT'] || settings['SYSTEM_LOGO'] || '/logo.svg',
          dark: settings['SYSTEM_LOGO_DARK'] || settings['SYSTEM_LOGO'] || '/logo.svg'
        })
        // Small delay for smooth fade-in
        setTimeout(() => setPageReady(true), 200)
      })
    }).catch(() => {
      setLogos({ light: '/logo.svg', dark: '/logo.svg' })
      setPageReady(true)
    })
  }, [])

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

  // Highly premium loading screen
  if (!pageReady) {
    return (
      <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated backgrounds */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex flex-col items-center gap-8 relative z-10">
          <div className="w-32 h-32 relative flex items-center justify-center transition-all duration-700 animate-in zoom-in-50">
            <div className="absolute inset-0 border-4 border-primary/10 rounded-[2.5rem] animate-ping opacity-20" />
            <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center shadow-inner overflow-hidden ring-1 ring-primary/10">
              <img src="/logo.svg" alt="Loading" className="w-16 h-16 object-contain opacity-50 grayscale contrast-125" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 mt-2">Preparing Resources</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-primary/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-secondary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-md w-full relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
        {/* Logo — massive and premium */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-64 h-64 overflow-hidden relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <img src={logos.light} alt="Logo" className="w-full h-full object-contain dark:hidden transition-all duration-500 hover:scale-105 drop-shadow-2xl" />
            <img src={logos.dark} alt="Logo" className="w-full h-full object-contain hidden dark:block transition-all duration-500 hover:scale-105 drop-shadow-2xl" />
          </div>
        </div>

        {/* Card — Modern Glassmorphism */}
        <div className="glass-panel shadow-ruby-massive border border-base-content/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl bg-base-100/60">
          <div className="p-10 lg:p-12 gap-8 flex flex-col">

            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tight text-base-content uppercase italic">Welcome Back</h2>
              <p className="text-[11px] font-bold text-base-content/30 uppercase tracking-[0.2em]">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control w-full">
                <label className="label py-0 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Email Address</span>
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    type="email"
                    placeholder="name@company.com"
                    className="w-full h-14 bg-base-content/5 border-none rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-base-content/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-0 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Security Password</span>
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/20 group-focus-within:text-primary transition-colors" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full h-14 bg-base-content/5 border-none rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-base-content/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-error text-[11px] font-bold uppercase tracking-wide bg-error/5 border border-error/10 px-4 py-4 rounded-2xl animate-in shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-14 bg-primary text-white rounded-2xl shadow-ruby-soft border-none hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-black uppercase tracking-[0.2em] relative overflow-hidden group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Enter Dashboard
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-12 opacity-30 group cursor-default">
          <div className="h-px w-12 bg-base-content/40 group-hover:w-24 transition-all duration-700" />
          <p className="text-[9px] font-black uppercase tracking-[0.4em]">Operations Management Platform v2.0</p>
        </div>
      </div>
    </div>
  )
}
