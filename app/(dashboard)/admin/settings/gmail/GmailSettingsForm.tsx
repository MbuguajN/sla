'use client'

import React, { useState, useTransition } from 'react'
import { saveSystemSettings } from '@/app/actions/settingsActions'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'

export default function GmailSettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    gmailClientId: initialSettings.gmailClientId || '',
    gmailClientSecret: initialSettings.gmailClientSecret || '',
    gmailRefreshToken: initialSettings.gmailRefreshToken || '',
    monitoredEmail: initialSettings.monitoredEmail || ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    
    startTransition(async () => {
      try {
        const result = await saveSystemSettings(formData)
        if (result.success) {
          setSuccess(true)
          setTimeout(() => setSuccess(false), 5000)
        } else {
          alert(`Failed to update tactical configuration: ${result.error}`)
        }
      } catch (err: any) {
        console.error(err)
        alert(`Failed to update tactical configuration: ${err.message || 'Unknown Error'}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-[11px] font-black uppercase tracking-widest text-base-content/50">Gmail Client ID</span>
          </label>
          <input 
            type="text" 
            className="input input-bordered w-full font-mono text-sm tracking-tight focus:border-primary border-base-300 bg-base-100 h-12"
            value={formData.gmailClientId}
            onChange={(e) => setFormData(prev => ({ ...prev, gmailClientId: e.target.value }))}
            placeholder="000000000000-xxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-[11px] font-black uppercase tracking-widest text-base-content/50">Client Secret</span>
          </label>
          <input 
            type="password" 
            className="input input-bordered w-full font-mono text-sm tracking-tight focus:border-primary border-base-300 bg-base-100 h-12"
            value={formData.gmailClientSecret}
            onChange={(e) => setFormData(prev => ({ ...prev, gmailClientSecret: e.target.value }))}
            placeholder="••••••••••••••••••••••••••••"
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-[11px] font-black uppercase tracking-widest text-base-content/50">Refresh Token</span>
          </label>
          <textarea 
            className="textarea textarea-bordered w-full font-mono text-sm tracking-tight focus:border-primary border-base-300 bg-base-100 h-24"
            value={formData.gmailRefreshToken}
            onChange={(e) => setFormData(prev => ({ ...prev, gmailRefreshToken: e.target.value }))}
            placeholder="1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text text-[11px] font-black uppercase tracking-widest text-base-content/50">Monitored Email Address</span>
          </label>
          <input 
            type="email" 
            className="input input-bordered w-full font-bold tracking-tight focus:border-primary border-base-300 bg-base-100 h-12"
            value={formData.monitoredEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, monitoredEmail: e.target.value }))}
            placeholder="nexus-sync@company.com"
          />
        </div>
      </div>

      <div className="pt-4 flex items-center gap-4">
        <button 
          type="submit" 
          disabled={isPending}
          className="btn btn-primary px-8 h-12 min-h-12 shadow-xl shadow-primary/20 gap-3"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isPending ? 'Propagating Changes...' : 'Save Configuration'}
        </button>

        {success && (
          <div className="flex items-center gap-2 text-success font-black text-xs uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
            <CheckCircle2 className="w-5 h-5" />
            Operational State Updated
          </div>
        )}
      </div>
    </form>
  )
}
