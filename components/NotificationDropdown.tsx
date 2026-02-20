'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle2, UserPlus, Eye, Clock, Trash2, AlertTriangle, MessageSquare, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: number
  content: string
  type: string
  link?: string
  isRead: boolean
  createdAt: Date
}

const POLLING_INTERVAL = 5000 // 5 seconds

export default function NotificationDropdown({ userId }: { userId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!res.ok) {
        console.error('🔔 Failed to fetch notifications:', res.status)
        return
      }

      const data = await res.json()
      setNotifications(data)
      console.log(`🔔 Fetched ${data.length} notifications`)
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Mark notification as read when clicking on it
  const markAsRead = async (notificationId: number, link?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )

      if (link) {
        window.location.href = link
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Purge all notifications
  const purgeAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
    } catch (error) {
      console.error('Failed to purge notifications:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'ASSIGNMENT':
        return <UserPlus className="w-4 h-4 text-primary" />
      case 'WATCHER':
      case 'AUTO_WATCHER':
        return <Eye className="w-4 h-4 text-info" />
      case 'BREACH_ALERT':
      case 'PAUSE_ALERT':
        return <AlertTriangle className="w-4 h-4 text-error" />
      case 'COMMENT':
      case 'MESSAGE_RECEIVED':
      case 'DEPT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-secondary" />
      case 'STATUS_REVIEW':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'PROJECT_ADDED':
        return <Play className="w-4 h-4 text-accent" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  return (
    <div className="dropdown dropdown-end">
      <button className="btn btn-ghost btn-circle" onClick={() => setOpen(!open)}>
        <div className="indicator">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <>
              <span className="badge badge-xs badge-primary indicator-item">{unreadCount}</span>
              <span className="badge badge-xs badge-primary indicator-item animate-ping opacity-75"></span>
            </>
          )}
        </div>
      </button>

      {open && (
        <ul className="mt-3 z-[1] p-0 shadow-2xl menu menu-sm dropdown-content bg-base-100 rounded-box w-80 border border-base-200 overflow-hidden divide-y divide-base-200 animate-in fade-in zoom-in-95">
          <li className="px-6 py-4 bg-base-200/50 flex flex-row justify-between items-center hover:bg-base-200/50">
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <>
                  <span className="badge badge-primary font-bold text-xs">{unreadCount} New</span>
                  <button
                    onClick={markAllAsRead}
                    className="btn btn-ghost btn-xs text-[9px]"
                    title="Mark all as read"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </li>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-2">
                <Bell className="w-8 h-8" />
                <span className="text-xs font-bold uppercase tracking-wider">Awaiting Intel</span>
              </div>
            ) : (
              notifications.map(n => (
                <li
                  key={n.id}
                  className={cn(
                    "hover:bg-primary/5 transition-colors cursor-pointer",
                    !n.isRead && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(n.id, n.link)}
                >
                  <div className="p-5 flex gap-5">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center border border-base-300 shadow-sm">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <p className="text-sm font-bold leading-tight text-base-content break-words">
                        {n.content}
                      </p>
                      <span className="text-xs opacity-60">
                        {formatDistanceToNow(new Date(n.createdAt))} ago
                      </span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <li className="p-2 flex items-center justify-center bg-base-200/20">
              <button
                onClick={purgeAll}
                className="btn btn-ghost btn-xs w-full text-xs font-bold uppercase tracking-wider hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Purge All Notifications
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
