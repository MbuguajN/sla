'use client'

import React, { useState } from 'react'
import { updateProfile } from '@/app/actions/profileActions'
import { User, Lock, ImageIcon, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfileForm({ user }: { user: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [password, setPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    try {
      await updateProfile({ name, password, avatarUrl })
      setSuccess(true)
      setPassword('')
    } catch (err) {
      console.error(err)
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div className="bg-primary p-8 text-primary-content">
          <h2 className="text-2xl font-bold uppercase tracking-tight">User Settings</h2>
          <p className="opacity-70 text-sm font-bold uppercase tracking-widest mt-1">Manage your identity and credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {success && (
            <div className="alert alert-success shadow-sm font-bold animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold uppercase tracking-wider text-xs opacity-50">Full Name</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="text"
                className="input input-bordered w-full pl-12 font-bold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold uppercase tracking-wider text-xs opacity-50">Avatar URL</span>
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                className="input input-bordered w-full pl-12 font-bold"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            {avatarUrl && (
              <div className="mt-4 flex items-center gap-4 p-4 bg-base-200/50 rounded-2xl border border-dashed border-base-300">
                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                  <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + name)} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase opacity-40">Avatar Preview</p>
                  <p className="text-xs font-bold opacity-60">This is how you'll appear in the system</p>
                </div>
              </div>
            )}
          </div>

          <div className="divider">Security</div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold uppercase tracking-wider text-xs opacity-50">Update Password (Optional)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="password"
                placeholder="Leave blank to keep current password"
                className="input input-bordered w-full pl-12 font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className={cn("btn btn-primary btn-block h-12 shadow-lg shadow-primary/20 gap-3 font-bold uppercase tracking-wider", loading && "loading")}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
