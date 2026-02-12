import React from 'react'
import prisma from '@/lib/db'
import { updateSla } from '@/app/actions/adminActions'
import { Clock } from 'lucide-react'

export default async function SlaPage() {
  const slas = await prisma.sla.findMany({ orderBy: { durationHrs: 'asc' }})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Service Level Agreements</h2>
          <p className="text-sm opacity-60">Define standard turnaround times for operations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slas.map((sla) => (
          <SlaCard key={sla.id} sla={sla} />
        ))}
      </div>
    </div>
  )
}

// Simple Server Action invocation UI
function SlaCard({ sla }: { sla: any }) {
  async function update(formData: FormData) {
    'use server'
    const duration = Number(formData.get('duration'))
    await updateSla(sla.id, duration)
  }

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm">
      <div className="card-body items-center text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
          sla.tier === 'URGENT' ? 'bg-error/10 text-error' :
          sla.tier === 'STANDARD' ? 'bg-primary/10 text-primary' :
          'bg-success/10 text-success'
        }`}>
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="card-title">{sla.name}</h3>
        <div className="badge badge-ghost mb-4">{sla.tier} TIER</div>
        
        <form action={update} className="flex flex-col gap-2 w-full">
          <div className="join w-full">
            <input 
              name="duration"
              type="number" 
              defaultValue={sla.durationHrs}
              className="input input-bordered input-sm join-item w-full text-center font-mono font-bold" 
            />
            <button type="submit" className="btn btn-sm btn-primary join-item">Hours</button>
          </div>
          <span className="text-[10px] text-base-content/40 uppercase font-bold tracking-widest">Target Duration</span>
        </form>
      </div>
    </div>
  )
}
