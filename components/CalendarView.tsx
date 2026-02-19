"use client"
import React from 'react'
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

type EventWithMeta = Event & { id: number; slaStatus?: string }

export default function CalendarView({ events }: { events: EventWithMeta[] }) {
  const router = useRouter()

  function eventStyleGetter(event: EventWithMeta) {
    let backgroundColor = '#e2e8f0'
    if (event.slaStatus === 'breached') backgroundColor = '#dc2626'
    else if (event.slaStatus === 'near') backgroundColor = '#f97316'
    else if (event.slaStatus === 'completed') backgroundColor = '#16a34a'
    return { style: { backgroundColor, color: '#fff', borderRadius: '6px', padding: '4px', fontSize: '12px', fontWeight: 'bold' } }
  }

  return (
    <div className="w-full" style={{ minHeight: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="month"
        style={{ height: 600 }}
        onSelectEvent={(e: any) => router.push(`/tasks/${e.id}`)}
        eventPropGetter={eventStyleGetter}
        components={{}}
      />
    </div>
  )
}
