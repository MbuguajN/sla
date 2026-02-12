'use client'

import { useState, useEffect } from 'react'
import { updateUser } from '@/app/actions/adminActions'
import { Edit, X, Save } from 'lucide-react'

export default function EditUserModal({ user, departments }: { user: any, departments: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    departmentId: ''
  })

  // Pre-fill data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', // Don't pre-fill password
        role: user.role || 'EMPLOYEE',
        departmentId: user.departmentId?.toString() || ''
      })
    }
  }, [isOpen, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateUser(user.id, formData)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      alert('Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="btn btn-xs btn-ghost text-primary opacity-50 hover:opacity-100" 
        title="Edit User"
      >
        <Edit className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-base-200 flex justify-between items-center bg-base-200/50">
              <h3 className="font-bold text-lg">Edit User: {user.name}</h3>
              <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-sm btn-circle">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Full Name</span></label>
                  <input 
                    required 
                    type="text" 
                    className="input input-bordered"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Email</span></label>
                  <input 
                    required 
                    type="email" 
                    className="input input-bordered"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">New Password</span>
                  <span className="label-text-alt opacity-50">Leave blank to keep current</span>
                </label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input input-bordered"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Role</span></label>
                  <select 
                    className="select select-bordered"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="DEPT_HEAD">Dept Head</option>
                    <option value="CLIENT_SERVICE">Client Service</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-bold">Department</span></label>
                  <select 
                    className="select select-bordered"
                    value={formData.departmentId}
                    onChange={e => setFormData({...formData, departmentId: e.target.value})}
                  >
                    <option value="">None</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary gap-2" disabled={loading}>
                  {loading ? <span className="loading loading-spinner loading-xs"/> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
