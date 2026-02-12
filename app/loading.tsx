import React from 'react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 w-[800px] bg-slate-200 rounded" />
      </div>
    </div>
  )
}
