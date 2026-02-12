
'use client'

import React, { useState } from 'react'
import { Filter, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function DashboardHeader({ initialDate }: { initialDate: Date }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const dateStr = searchParams.get('date')
  const date = dateStr ? new Date(dateStr) : initialDate

  const updateDate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', format(newDate, 'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
  }
  
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-base-content tracking-tight uppercase leading-none">Operational Timeline</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="join">
          <button 
            className="btn btn-sm btn-outline join-item hover:bg-primary hover:text-white"
            onClick={() => {
              const prev = new Date(date)
              prev.setMonth(prev.getMonth() - 1)
              updateDate(prev)
            }}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button className="btn btn-sm btn-outline join-item font-black uppercase tracking-widest text-[10px] min-w-[100px]">
            {format(date, 'MMM yyyy')}
          </button>
          <button 
            className="btn btn-sm btn-outline join-item hover:bg-primary hover:text-white"
            onClick={() => {
              const next = new Date(date)
              next.setMonth(next.getMonth() + 1)
              updateDate(next)
            }}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
