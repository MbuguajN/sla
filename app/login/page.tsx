'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Activity, Lock, Mail, Loader2 } from "lucide-react"

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

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-primary rounded-2xl shadow-xl shadow-primary/20 mb-6 overflow-hidden">
            <span className="text-2xl font-black text-white tracking-tight">5DM</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-base-content uppercase">5DM AFRICA</h1>
          <p className="mt-2 text-sm font-bold text-primary tracking-widest uppercase">Operational Authentication</p>
        </div>

        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-10 gap-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Internal Email</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                  <input
                    required
                    type="email"
                    placeholder="name@company.com"
                    className="input input-bordered w-full pl-12 focus:border-primary transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-bold uppercase tracking-widest text-[10px] text-base-content/50">Security Key</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/30" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered w-full pl-12 focus:border-primary transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="alert alert-error text-xs font-bold py-3 rounded-xl border-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block shadow-lg shadow-primary/20 gap-3"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Authenticating...' : 'Enter 5DM Hub'}
              </button>
            </form>

            <div className="divider text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mt-4">Protected Resource</div>
            <p className="text-center text-[10px] font-medium text-base-content/40 uppercase">
              Authorization required for system oversight
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
