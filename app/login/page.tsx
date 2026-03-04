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
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-start lg:justify-center p-6 py-12 lg:py-6 relative overflow-x-hidden font-sans">
      {/* Subtle Understated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--p),0.02),transparent_70%)]" />
        <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-primary/5 blur-[80px] rounded-full" />
      </div>

      <div className="max-w-[400px] w-full relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
        {/* Card — Professional Glassmorphism */}
        <div className="w-full bg-base-100/40 backdrop-blur-2xl border border-base-content/5 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 lg:p-10 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            {/* Logo — Prominent & Integrated */}
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 overflow-hidden relative mb-1 md:mb-2">
              <img src={logos.light} alt="Logo" className="w-full h-full object-contain dark:hidden transition-all duration-500 drop-shadow-md" />
              <img src={logos.dark} alt="Logo" className="w-full h-full object-contain hidden dark:block transition-all duration-500 drop-shadow-md" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-base-content uppercase">Authorized Access</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div className="form-control w-full">
              <label className="label py-0 mb-1.5 ml-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-base-content/40">Email Address</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/20" />
                <input
                  required
                  type="email"
                  placeholder="name@company.com"
                  className="w-full h-11 bg-base-content/5 border border-base-content/5 rounded-xl pl-11 pr-4 text-xs font-semibold focus:ring-1 ring-primary/30 outline-none transition-all placeholder:text-base-content/10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label py-0 mb-1.5 ml-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-base-content/40">Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/20" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-11 bg-base-content/5 border border-base-content/5 rounded-xl pl-11 pr-4 text-xs font-semibold focus:ring-1 ring-primary/30 outline-none transition-all placeholder:text-base-content/10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-error text-[10px] font-bold uppercase tracking-wide bg-error/5 border border-error/10 px-4 py-3 rounded-xl animate-in shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-primary text-white rounded-xl shadow-lg border-none hover:brightness-110 active:scale-[0.98] transition-all text-[11px] font-bold uppercase tracking-[0.2em] relative group mt-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <span>Authorize Access</span>
              )}
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-3 mt-10 opacity-20">
          <div className="h-px w-8 bg-base-content/40" />
          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-center">
            System Instance v2.4.0
          </p>
        </div>
      </div>
    </div>
  )
}
