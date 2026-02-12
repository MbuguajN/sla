import prisma from '@/lib/db'
import TaskForm from './TaskForm'

export default async function NewTaskPage() {
  const departments = await prisma.department.findMany()
  const slas = await prisma.sla.findMany()
  const users = await prisma.user.findMany()

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-base-content tracking-tight uppercase">Create New Task</h1>
        <p className="text-sm font-medium text-base-content/60">Initialize a new service request and define SLA parameters.</p>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-8">
          <TaskForm 
            departments={departments} 
            slas={slas} 
            users={users} 
          />
        </div>
      </div>
    </div>
  )
}
