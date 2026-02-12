'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Folder, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        router.push('/projects')
        router.refresh()
      } else {
        alert('Failed to create project')
      }
    } catch (err) {
      console.error(err)
      alert('Error creating project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/projects" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
          <Folder className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight uppercase">Initialize New Project</h1>
          <p className="text-sm font-medium text-base-content/60">Create a strategic directive group</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-8 space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-sm uppercase tracking-wider">Project Title</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Q1 2024 Digital Transformation"
              className="input input-bordered w-full"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-sm uppercase tracking-wider">Description</span>
            </label>
            <textarea
              required
              placeholder="Describe the project objectives and scope..."
              className="textarea textarea-bordered h-32 w-full"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="divider"></div>

          <div className="flex justify-end gap-3">
            <Link href="/projects" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="btn btn-primary gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Initialize Project
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
