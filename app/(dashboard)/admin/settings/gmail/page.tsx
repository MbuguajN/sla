import React from 'react'
import { getSystemSettings } from '@/app/actions/settingsActions'
import GmailSettingsForm from './GmailSettingsForm'
import { Mail, Shield, Key, AtSign } from 'lucide-react'

export default async function GmailSettingsPage() {
  const keys = ['gmailClientId', 'gmailClientSecret', 'gmailRefreshToken', 'monitoredEmail']
  const settings = await getSystemSettings(keys)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-base-content uppercase flex items-center gap-4">
          <Mail className="w-10 h-10 text-primary" />
          GSuite Engine Configuration
        </h1>
        <p className="text-base-content/60 font-medium max-w-2xl text-lg">
          Configure the core synchronization engine for Gmail integration. These settings allow Nexus to monitor incoming directives and automate ticket generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="card bg-base-100 shadow-2xl border border-base-200 overflow-hidden">
            <div className="p-8 space-y-8">
              <GmailSettingsForm initialSettings={settings} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-primary text-primary-content p-6 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-80">Operational Requirements</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <Shield className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">Encrypted Storage: All secrets are hashed with AES-256 before persistence.</span>
              </li>
              <li className="flex gap-3">
                <Key className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">API Access: Requires 'https://www.googleapis.com/auth/gmail.modify' scope permissions.</span>
              </li>
              <li className="flex gap-3">
                <AtSign className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">Monitoring: Engine checks for new mail every 60 seconds.</span>
              </li>
            </ul>
          </div>

          <div className="alert alert-warning text-xs font-bold rounded-2xl border-none shadow-lg">
            <div className="flex gap-3 items-start">
              <Shield className="w-4 h-4 mt-0.5" />
              <span>
                <strong>WARNING:</strong> Modifying these settings will restart the sync engine and may cause temporary downtime in automated ticket creation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
