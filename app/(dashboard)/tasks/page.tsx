import prisma from '@/lib/db'
import { format } from 'date-fns'
import Link from 'next/link'
import { 
  ArrowUpDown, 
  MessageCircle, 
  Clock, 
  User, 
  ExternalLink,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react'
import SLACountdown from '@/components/SLACountdown'
import ExportCSVButton from '@/components/ExportCSVButton'
import { cn } from '@/lib/utils'

export default async function GlobalTaskIndexPage() {
  /* 
   * OPTIMIZED QUERY: Using select instead of include to fetch only needed fields.
   * This reduces payload size significantly for the list view.
   */
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      createdAt: true,
      sla: {
        select: {
          name: true,
          tier: true,
        }
      },
      assignee: {
        select: {
          name: true,
          id: true,
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }) as any

  // Sort by SLA urgency
  const sortedTasks = tasks.sort((a: { sla: { tier: string } }, b: { sla: { tier: string } }) => {
    const tierPriority: Record<string, number> = { 'URGENT': 0, 'STANDARD': 1, 'LOW': 2 }
    return (tierPriority[a.sla.tier] ?? 3) - (tierPriority[b.sla.tier] ?? 3)
  })

  // Prepare export data
  const exportData = sortedTasks.map((t: any) => ({
    ID: `NX-${t.id}`,
    Title: t.title,
    Assignee: t.assignee?.name || 'Unassigned',
    SLA: t.sla.name,
    Tier: t.sla.tier,
    Status: t.status,
    CreatedAt: t.createdAt.toISOString(),
    DueAt: t.dueAt?.toISOString() || 'N/A'
  }))

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-base-content tracking-tight uppercase">Global Task Index</h1>
            <p className="text-sm font-medium text-base-content/60">Monitoring {sortedTasks.length} active service commitments</p>
          </div>
        </div>
        <ExportCSVButton data={exportData} filename="Global_Task_Export" />
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-base-200/50">
              <tr className="text-[10px] font-black uppercase tracking-widest text-base-content/40 border-b border-base-200">
                <th className="py-4 pl-6">Directive</th>
                <th className="py-4">Resource</th>
                <th className="py-4">Timeline</th>
                <th className="py-4">Status</th>
                <th className="py-4">Last Event</th>
                <th className="py-4 text-right pr-6">Management</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task: any) => {
                const lastMessage = task.messages[0]
                const isCompleted = task.status === 'COMPLETED'
                
                return (
                  <tr key={task.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm text-base-content group-hover:text-primary transition-colors">{task.title}</span>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-black text-base-content/30">
                          <span className="badge badge-xs badge-neutral px-2 font-black border-none uppercase tracking-widest">{task.sla.name}</span>
                          <span className="font-mono">#{task.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-lg w-7 h-7">
                            <span className="text-[10px] font-bold">{task.assignee?.name?.charAt(0) || '?'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold">{task.assignee?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      {task.dueAt && (
                        <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />
                      )}
                    </td>
                    <td className="py-4">
                      <div className={cn(
                        "badge badge-xs font-bold p-2 h-5 text-[9px] uppercase tracking-tighter",
                        task.status === 'COMPLETED' ? "badge-success" : 
                        task.status === 'IN_PROGRESS' ? "badge-primary" : 
                        "badge-ghost border-base-300"
                      )}>
                        {task.status.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 group/msg relative cursor-help">
                        <MessageCircle className="w-4 h-4 text-primary opacity-50" />
                        <div className="text-[10px] font-medium text-base-content/60 max-w-[120px] truncate italic">
                          {lastMessage ? `"${lastMessage.content}"` : '--'}
                        </div>
                        {lastMessage && (
                           <div className="absolute bottom-full left-0 mb-2 p-3 bg-base-100 border border-base-300 rounded-xl shadow-xl w-64 hidden group-hover/msg:block z-50 animate-in fade-in slide-in-from-bottom-2">
                             <div className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Observation Log</div>
                             <p className="text-xs font-bold text-base-content leading-relaxed">"{lastMessage.content}"</p>
                             <div className="text-[9px] text-base-content/40 mt-2 font-black uppercase">{format(new Date(lastMessage.createdAt), 'PPp')}</div>
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right pr-6">
                      <Link href={`/tasks/${task.id}`} className="btn btn-ghost btn-xs btn-circle hover:bg-primary hover:text-primary-content">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-base-100">
              {sortedTasks.map((task: any) => {
             const isCompleted = task.status === 'COMPLETED'
             return (
               <div key={task.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <Link href={`/tasks/${task.id}`} className="font-bold text-sm text-base-content">
                        {task.title}
                      </Link>
                      <div className="flex items-center gap-2">
                         <span className="badge badge-xs badge-neutral font-black uppercase tracking-widest text-[8px]">{task.sla.name}</span>
                         <span className="text-[9px] font-mono opacity-40">#{task.id}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "badge badge-xs font-bold p-2 h-5 text-[8px] uppercase tracking-tighter",
                      task.status === 'COMPLETED' ? "badge-success" : 
                      task.status === 'IN_PROGRESS' ? "badge-primary" : 
                      "badge-ghost"
                    )}>
                      {task.status.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="avatar placeholder">
                         <div className="bg-neutral text-neutral-content rounded-lg w-6 h-6">
                           <span className="text-[10px]">{task.assignee?.name?.charAt(0) || '?'}</span>
                         </div>
                      </div>
                      <span className="text-[10px] font-bold">{task.assignee?.name || 'Unassigned'}</span>
                    </div>
                    {task.dueAt && <SLACountdown dueDate={task.dueAt} isCompleted={isCompleted} />}
                  </div>
               </div>
             )
           })}
        </div>

        {sortedTasks.length === 0 && (
          <div className="py-20 text-center opacity-20 border-t border-base-200">
             <ClipboardList className="w-12 h-12 mx-auto mb-2" />
             <span className="text-xl font-black uppercase tracking-tighter">No Active Directives</span>
          </div>
        )}
      </div>
    </div>
  )
}
