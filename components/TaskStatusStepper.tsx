"use client"
import React, { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { updateTaskStatus } from '../app/actions/taskActions'

export default function TaskStatusStepper({ taskId, currentStatus }: { taskId: number; currentStatus: string }) {
  const steps = ['PENDING', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED']
  const [status, setStatus] = useState(currentStatus)
  const nextIndex = Math.min(steps.indexOf(status) + 1, steps.length - 1)

  async function advance() {
    const next = steps[nextIndex]
    setStatus(next)
    try {
      await updateTaskStatus(taskId, next as any)
    } catch (e) {
      console.error(e)
      // rollback
      setStatus(currentStatus)
    }
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    'PENDING': 'outline',
    'RECEIVED': 'secondary',
    'IN_PROGRESS': 'default',
    'COMPLETED': 'default',
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {steps.map((s) => (
          <Badge key={s} variant={s === status ? statusVariants[s] : 'outline'}>
            {s}
          </Badge>
        ))}
      </div>
      <div>
        <Button onClick={advance} disabled={status === 'COMPLETED'}>
          Advance Status
        </Button>
      </div>
    </div>
  )
}
