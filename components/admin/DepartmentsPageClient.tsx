'use client'

import { useState } from 'react'
import { createDepartment, assignDepartmentHead, deleteDepartment } from '@/app/actions/adminActions'
import { Building2, UserPlus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DepartmentsPageClient({ initialDepartments, users }: { initialDepartments: any[], users: any[] }) {
  const [newDeptName, setNewDeptName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newDeptName) return
    setLoading(true)
    try {
      await createDepartment(newDeptName)
      setNewDeptName('')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert("Error creating department")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Organizational Units</h2>
          <p className="text-sm opacity-60">Define operational structure and leadership</p>
        </div>
        
        <form onSubmit={handleCreate} className="flex gap-2">
          <input 
            type="text" 
            placeholder="New Department Name" 
            className="input input-bordered input-sm"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            <Building2 className="w-4 h-4" /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialDepartments.map((dept) => (
          <DepartmentCard key={dept.id} dept={dept} users={users} router={router} />
        ))}
      </div>
    </div>
  )
}

function DepartmentCard({ dept, users, router }: { dept: any, users: any[], router: any }) {
  const [selectedHeadId, setSelectedHeadId] = useState(dept.headId?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleAssignHead() {
    setSaving(true)
    try {
      await assignDepartmentHead(dept.id, Number(selectedHeadId))
      router.refresh()
    } catch (err) {
      console.error(err)
      alert("Failed to assign head")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false)
    console.log('DELETE CONFIRMED, calling server action...')
    setDeleting(true)
    try {
      console.log('Calling deleteDepartment with id:', dept.id)
      const result = await deleteDepartment(dept.id)
      console.log('DELETE RESULT:', result)
      if (result && result.success) {
        console.log('DELETE SUCCESS, refreshing...')
        router.refresh()
      } else {
        console.error('DELETE FAILED:', result)
        alert(result?.error || "Failed to delete department")
      }
    } catch (err) {
      console.error('DELETE ERROR:', err)
      alert("System Error: Failed to invoke delete action")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg">Delete Department?</h3>
            <p className="text-sm opacity-70">
              Are you sure you want to delete <span className="font-bold text-primary">{dept.name}</span>? 
              Users in this department will be unassigned but not deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={confirmDelete} className="btn btn-error">Delete Department</button>
            </div>
          </div>
        </div>
      )}

    <div className="card bg-base-100 border border-base-200 shadow-sm group hover:shadow-md transition-all">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <h3 className="card-title text-primary">{dept.name}</h3>
          
          <div className="flex items-center gap-2">
             <div className="badge badge-outline text-xs">{dept.users.length} Members</div>
             <button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('DELETE CLICKED', dept.id, dept.name)
                setShowDeleteConfirm(true)
              }} 
              disabled={deleting}
              className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity z-10"
              title="Delete Department"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="divider my-2"></div>
        
        <div className="form-control w-full">
          <label className="label">
             <span className="label-text-alt font-bold uppercase tracking-wider opacity-60">Department Head</span>
          </label>
          <div className="flex gap-2">
            <select 
              className="select select-bordered select-sm flex-1"
              value={selectedHeadId}
              onChange={(e) => setSelectedHeadId(e.target.value)}
            >
              <option value="">No Leadership Assigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button 
              onClick={handleAssignHead} 
              disabled={saving || selectedHeadId === dept.headId?.toString()}
              className="btn btn-sm btn-ghost btn-square"
              title="Save Leadership Assignment"
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
