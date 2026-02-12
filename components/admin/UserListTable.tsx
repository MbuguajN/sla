'use client'

import { deleteUser } from '@/app/actions/adminActions'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import EditUserModal from './EditUserModal'

export default function UserListTable({ users, departments }: { users: any[], departments: any[] }) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(user: any) {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return
    setDeletingId(user.id)
    try {
      await deleteUser(user.id)
    } catch (err) {
      console.error(err)
      alert("Failed to delete user")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
          <thead>
            <tr className="bg-base-200/50">
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-base-200/20 transition-colors">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-base-300 text-base-content rounded-full w-10 h-10 flex items-center justify-center overflow-hidden">
                        <span className="font-bold flex items-center justify-center">{user.name?.charAt(0)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{user.name}</div>
                      <div className="text-xs opacity-50">ID: {user.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-sm font-bold ${
                    user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'badge-error text-error-content' : 
                    user.role === 'CLIENT_SERVICE' ? 'badge-primary' : 
                    'badge-ghost'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.department?.name ? (
                    <div className="badge badge-outline gap-1 font-mono text-xs">
                      {user.department.name}
                    </div>
                  ) : <span className="opacity-30 text-xs italic">Unassigned</span>}
                </td>
                <td className="font-mono text-xs opacity-70">{user.email}</td>
                <td>
                  <div className="badge badge-ghost badge-xs bg-success/20 text-success border-0 gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success"></div> Active
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <EditUserModal user={user} departments={departments} />
                    <button 
                        onClick={() => handleDelete(user)} 
                        disabled={deletingId === user.id}
                        className="btn btn-xs btn-ghost text-error" 
                        title="Delete User"
                    >
                        {deletingId === user.id ? <span className="loading loading-spinner loading-xs"/> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  )
}
