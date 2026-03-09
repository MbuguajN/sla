'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, ExternalLink, Clock } from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead } from '@/app/actions/notificationActions'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [portalCoords, setPortalCoords] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const fetchNotifications = async () => {
    const res = await getNotifications()
    if (res.success) {
      setNotifications(res.notifications || [])
      setUnreadCount(res.unreadCount || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPortalCoords({
        top: rect.bottom + 12,
        left: Math.max(16, rect.right - 384) // 384 = w-96
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(t) &&
        dropdownRef.current && !dropdownRef.current.contains(t)
      ) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleMarkAsRead = async (id: number) => {
    const res = await markAsRead(id)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    const res = await markAllAsRead()
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    }
  }

  // Navigate to notification link and mark as read
  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      handleMarkAsRead(n.id)
    }

    // Determine the correct link
    let targetLink = n.link
    if (!targetLink) {
      // Fallback: map notification types to default pages
      switch (n.type) {
        case 'TASK_ASSIGNED':
        case 'ASSIGNMENT':
          targetLink = '/client-service/tickets'
          break
        case 'STATUS_REVIEW':
        case 'COMMENT':
        case 'MESSAGE_RECEIVED':
          targetLink = n.taskId ? `/tasks/${n.taskId}` : '/'
          break
        case 'BREACH_ALERT':
        case 'PAUSE_ALERT':
          targetLink = '/'
          break
        case 'AUTO_WATCHER':
        case 'WATCHER':
          targetLink = n.taskId ? `/tasks/${n.taskId}` : '/'
          break
        default:
          targetLink = '/'
      }
    }

    setIsOpen(false)
    router.push(targetLink)
  }

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: portalCoords.top, left: portalCoords.left, zIndex: 9999 }}
      className="w-80 lg:w-96 bg-base-100 !bg-opacity-100 rounded-2xl shadow-2xl border border-base-content/10 overflow-hidden animate-in fade-in slide-in-from-top-2"
    >
      {/* Header */}
      <div className="p-4 border-b border-base-content/20 flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-sm font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="text-sm font-black uppercase tracking-widest text-base-content/70 hover:text-primary transition-colors flex items-center gap-1">
            <Check size={12} /> Mark All Read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 opacity-30">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 opacity-20">
            <Bell size={24} />
            <span className="text-sm font-bold uppercase tracking-widest text-center">No notifications</span>
          </div>
        ) : (
          <div className="divide-y divide-base-content/5">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-3 hover:bg-base-content/5 transition-all relative cursor-pointer group",
                  !n.isRead && "bg-primary/[0.03]"
                )}
              >
                {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                <div className="flex gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    !n.isRead ? "bg-primary/15 text-primary" : "bg-base-content/5 text-base-content/30"
                  )}>
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-black uppercase tracking-widest text-primary/60">
                        {n.type?.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-base-content/25">
                        <Clock size={9} />
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <p className={cn(
                      "text-xs leading-relaxed",
                      !n.isRead ? "font-semibold text-base-content" : "font-medium text-base-content/70"
                    )}>
                      {n.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative">
      <div
        ref={buttonRef}
        role="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-11 h-11 rounded-2xl bg-base-content/5 grid place-items-center text-base-content/80 hover:bg-primary/10 hover:text-primary transition-all group cursor-pointer"
      >
        <Bell size={20} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-base-100 animate-pulse" />
        )}
      </div>

      {mounted && isOpen && createPortal(dropdown, document.body)}
    </div>
  )
}
