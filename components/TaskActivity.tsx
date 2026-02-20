'use client'

import React from 'react'
import { format } from 'date-fns'
import {
  Activity,
  History,
  MessageSquare,
  PlusCircle,
  ArrowRightLeft,
  User as UserIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: number
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
  user: {
    name: string | null
  }
}

export default function TaskActivity({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-2 border-2 border-dashed border-base-300 rounded-xl">
        <History className="w-8 h-8" />
        <span className="text-xs font-bold uppercase tracking-wider">No Activity Yet</span>
      </div>
    )
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'TASK_CREATED': return <PlusCircle className="w-4 h-4 text-primary" />
      case 'STATUS_CHANGE': return <ArrowRightLeft className="w-4 h-4 text-info" />
      case 'COMMENT_ADDED': return <MessageSquare className="w-4 h-4 text-success" />
      default: return <Activity className="w-4 h-4 text-base-content/40" />
    }
  }

  const formatValue = (action: string, value: string | null) => {
    if (!value) return 'N/A'
    return value
  }

  return (
    <div className="bg-base-100 rounded-2xl border border-base-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-base-200/20 border-b border-base-200 flex items-center gap-3">
        <History className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-base-content">Operational History</h3>
      </div>

      <div className="p-0">
        <div className="overflow-x-auto">
          <table className="table table-md w-full border-collapse">
            <thead>
              <tr className="bg-base-100 border-b border-base-200">
                <th className="text-xs uppercase font-bold tracking-wider text-base-content/40 pl-6">Operator</th>
                <th className="text-xs uppercase font-bold tracking-wider text-base-content/40">Action</th>
                <th className="text-xs uppercase font-bold tracking-wider text-base-content/40">Details</th>
                <th className="text-xs uppercase font-bold tracking-wider text-base-content/40 text-right pr-6">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-base-200/30 transition-colors border-b border-base-200/50">
                  <td className="pl-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-xs font-bold">{log.user.name || '5DM System'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {getIcon(log.action)}
                      <span className="text-xs font-bold uppercase tracking-tight text-base-content/60">
                        {log.action.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-xs">
                    <div className="flex flex-col gap-1">
                      {log.action === 'STATUS_CHANGE' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span className="px-1.5 py-0.5 bg-base-300 rounded text-base-content/60">{log.oldValue}</span>
                          <span className="text-primary">→</span>
                          <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded">{log.newValue}</span>
                        </div>
                      )}
                      {log.action === 'COMMENT_ADDED' && (
                        <span className="text-xs text-base-content/70 italic truncate">"{log.newValue}"</span>
                      )}
                      {log.action === 'TASK_CREATED' && (
                        <span className="text-xs font-semibold text-primary">Directive Initiated</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right pr-6">
                    <span className="text-xs font-medium opacity-60 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
