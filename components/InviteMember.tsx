'use client'

import React, { useState } from 'react'
import { Users, Search, Loader2 } from 'lucide-react'
import { inviteToProject } from '@/app/actions/projectActions'
import { useRouter } from 'next/navigation'

export default function InviteMember({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  async function handleSearch() {
    if (!search.trim()) return
    setIsSearching(true)
    try {
      // In a real app, this would be a server action to search users
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`)
      const data = await response.json()
      setUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleInvite(userId: number) {
    setLoading(true)
    try {
      await inviteToProject(projectId, userId)
      setIsOpen(false)
      router.refresh()
    } catch (e) {
      alert("Failed to invite user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-outline btn-sm gap-2"
      >
        <Users className="w-4 h-4" /> Invite
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 border border-base-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-base-200 bg-base-200/20">
               <h3 className="text-sm font-black uppercase tracking-widest">Deploy Resource to Project</h3>
               <p className="text-[10px] font-bold text-base-content/40 uppercase mt-1">Add user as watcher to all directives</p>
            </div>
            
            <div className="p-6 space-y-4">
               <div className="relative">
                 <input 
                   type="text"
                   placeholder="Search by name or email..."
                   className="input input-bordered w-full pr-10 text-xs font-bold"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                 />
                 <button 
                   onClick={handleSearch}
                   className="absolute right-2 top-1.5 btn btn-ghost btn-xs btn-circle"
                 >
                   {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                 </button>
               </div>

               <div className="space-y-2 max-h-60 overflow-y-auto min-h-[100px]">
                 {users.length === 0 ? (
                   <div className="text-center py-8 opacity-30">
                     <Users className="w-8 h-8 mx-auto mb-2" />
                     <p className="text-[10px] font-bold uppercase">No candidates found</p>
                   </div>
                 ) : (
                   users.map(user => (
                     <div key={user.id} className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl border border-transparent hover:border-primary/20 transition-all">
                       <div className="flex flex-col">
                         <span className="text-xs font-bold">{user.name}</span>
                         <span className="text-[10px] opacity-40">{user.email}</span>
                       </div>
                       <button 
                         onClick={() => handleInvite(user.id)}
                         disabled={loading}
                         className="btn btn-primary btn-xs font-black uppercase tracking-widest"
                       >
                         {loading ? '...' : 'Add'}
                       </button>
                     </div>
                   ))
                 )}
               </div>
            </div>

            <div className="p-4 bg-base-200/50 flex justify-end gap-2">
               <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-xs font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
