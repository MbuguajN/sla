'use client'

import React, { useState } from 'react'
import { Users, Search, Loader2 } from 'lucide-react'
import { addProjectMember, getEligibleUsers } from '@/app/actions/projectActions'
import { useRouter } from 'next/navigation'

export default function InviteMember({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  async function handleSearch() {
    setIsSearching(true)
    try {
      const allEligible = await getEligibleUsers()
      if (!search.trim()) {
        setUsers(allEligible)
      } else {
        const term = search.toLowerCase()
        setUsers(allEligible.filter((u: any) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
        ))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleInvite(userId: number) {
    setLoading(true)
    try {
      const res = await addProjectMember(projectId, userId)
      if (res.success) {
        setIsOpen(false)
        router.refresh()
      } else {
        alert(res.error)
      }
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
              <h3 className="text-sm font-bold uppercase tracking-wider">Add Team Member to Project</h3>
              <p className="text-xs font-normal text-base-content/40 mt-1">Add a user to this project</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input input-bordered w-full pr-10 text-sm font-medium"
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

              <div className="space-y-2 max-h-[320px] overflow-y-auto px-1 premium-scrollbar">
                {users.length === 0 ? (
                  <div className="text-center py-12 opacity-20">
                    <Users className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">No candidates found</p>
                  </div>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="group/item flex items-center justify-between p-4 bg-base-content/[0.02] hover:bg-primary/[0.04] rounded-2xl border border-base-content/5 transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/10">
                          {user.name?.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-base-content/80 group-hover/item:text-primary transition-colors truncate">
                            {user.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-base-content/20 truncate max-w-[120px]">
                              {user.email}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-base-content/10 shrink-0" />
                            <span className="text-[9px] font-bold text-primary opacity-40 uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInvite(user.id)}
                        disabled={loading}
                        className="btn btn-primary btn-sm h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-ruby-soft"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-base-200/50 flex justify-end gap-2">
              <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-xs font-bold uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
