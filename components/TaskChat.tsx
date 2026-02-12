"use client"
import React, { useState } from 'react'
import { sendMessage as sendMessageAction } from '../app/actions/taskActions'
import { Send } from 'lucide-react'

type Message = {
  id?: number
  authorId: number
  authorName?: string
  content: string
  createdAt?: string
}

// Simple optimistic hook (local) to mimic `useOptimistic` behaviour
function useOptimisticList<T>(initial: T[]) {
  const [list, setList] = useState<T[]>(initial)
  const push = (item: T) => setList((s) => [...s, item])
  const replace = (newList: T[]) => setList(newList)
  return [list, push, replace] as const
}

export default function TaskChat({ 
  taskId, 
  projectId,
  initialMessages = [], 
  currentUserId 
}: { 
  taskId?: number; 
  projectId?: number;
  initialMessages?: Message[]; 
  currentUserId: number 
}) {
  const [messages, pushMessage, replaceMessages] = useOptimisticList<Message>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim()) return
    const optimistic: Message = { 
      authorId: currentUserId, 
      content: text, 
      createdAt: new Date().toISOString(),
      authorName: 'You'
    }
    pushMessage(optimistic)
    setText('')
    setSending(true)
    try {
      await sendMessageAction(taskId || null, currentUserId, optimistic.content, projectId || null)
    } catch (err) {
      replaceMessages(messages.filter((m) => m !== optimistic))
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full">
      <div className="p-6">
        {/* Messages */}
        <div className="space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto mb-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-base-content/40 text-sm italic">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`chat ${m.authorId === currentUserId ? 'chat-end' : 'chat-start'}`}
              >
                <div className="chat-header text-xs opacity-60 mb-1">
                  {m.authorName || `User ${m.authorId}`}
                </div>
                <div className={`chat-bubble ${m.authorId === currentUserId ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                  {m.content}
                </div>
                <div className="chat-footer text-xs opacity-50 mt-1">
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : 'sending...'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Write a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            className="input input-bordered flex-1"
          />
          <button 
            type="submit" 
            disabled={sending || !text.trim()}
            className="btn btn-primary gap-2"
          >
            {sending ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
