
'use client'
import React, { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Newspaper, Send, X, Image as ImageIcon, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createStory } from '@/app/actions/storyActions'

type Story = {
  id: number
  title: string
  content: string
  imageUrl?: string | null
  createdAt: Date
  author: { name: string | null }
}

export default function NewsBoard({ initialStories }: { initialStories: Story[] }) {
  const [stories, setStories] = useState<Story[]>(initialStories)
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  async function handleUpload() {
    if (!newTitle || !newContent) return
    
    try {
      const story = await createStory({
        title: newTitle,
        content: newContent
      })
      
      setStories([story as any, ...stories])
      setIsAdding(false)
      setNewTitle('')
      setNewContent('')
    } catch (err) {
      alert("Deployment failed: Authorization required.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black uppercase tracking-widest text-base-content/40">Operational Intel (News)</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn btn-primary btn-xs gap-1 uppercase font-black"
        >
          <Plus className="w-3 h-3" /> Post Story
        </button>
      </div>

      {isAdding && (
        <div className="card bg-base-100 border-2 border-primary/20 shadow-xl p-6 animate-in zoom-in duration-200">
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-black uppercase text-xs tracking-widest text-primary">New Operational Brief</h4>
              <button onClick={() => setIsAdding(false)} className="btn btn-ghost btn-xs btn-circle"><X className="w-4 h-4" /></button>
           </div>
           <input 
             type="text" 
             placeholder="Brief Title..." 
             className="input input-ghost w-full font-bold text-lg mb-2 focus:bg-transparent"
             value={newTitle}
             onChange={(e) => setNewTitle(e.target.value)}
           />
           <textarea 
             placeholder="Type here..." 
             className="textarea textarea-ghost w-full h-32 focus:bg-transparent text-sm leading-relaxed"
             value={newContent}
             onChange={(e) => setNewContent(e.target.value)}
           />
           <div className="flex justify-between mt-4">
              <div className="flex gap-2">
                <label className="btn btn-ghost btn-sm gap-2 border border-dashed border-base-300 hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
                  <Upload className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Upload Media</span>
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              </div>
              <button onClick={handleUpload} className="btn btn-primary btn-sm gap-2 px-8 font-black uppercase tracking-widest text-[10px]">
                <Send className="w-4 h-4" /> Deploy Intel
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map(story => (
          <div key={story.id} className="group relative flex flex-col p-6 bg-base-100 border border-base-200 rounded-2xl shadow-sm transition-all hover:border-primary/40 hover:shadow-md cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">
                 {format(new Date(story.createdAt), 'dd MMM yyyy')} • {story.author.name}
               </span>
            </div>
            <h4 className="text-lg font-black tracking-tight mb-2 group-hover:text-primary transition-colors">{story.title}</h4>
            <p className="text-sm text-base-content/60 line-clamp-3 leading-relaxed">
              {story.content}
            </p>
            <div className="mt-4 flex items-center gap-1 text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Read Brief <Plus className="w-3 h-3" />
            </div>
          </div>
        ))}
        {stories.length === 0 && !isAdding && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-base-200 rounded-3xl">
             <Newspaper className="w-12 h-12 mb-2" />
             <span className="font-black uppercase tracking-widest text-xs">No Intel Available</span>
          </div>
        )}
      </div>
    </div>
  )
}
