import React from 'react'
import prisma from '@/lib/db'
import Link from 'next/link'
import { FolderGit2, ArrowRight } from 'lucide-react'
import { TaskStatus } from '@/lib/enums'

export default async function ProjectsGrid() {
    const projects = await prisma.project.findMany({
        include: {
            tasks: {
                select: { status: true }
            }
        },
        take: 6,
        orderBy: { updatedAt: 'desc' }
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Active Projects</h3>
                <Link href="/projects" className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map(project => {
                    const total = project.tasks.length
                    const completed = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length
                    const progress = total > 0 ? (completed / total) * 100 : 0

                    return (
                        <Link key={project.id} href={`/projects/${project.id}`} className="group bg-base-100 border border-base-200 p-4 rounded-xl shadow-sm hover:border-primary/50 transition-all hover:translate-y-[-2px]">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 bg-base-200 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <FolderGit2 className="w-4 h-4" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-30">#{project.id}</span>
                            </div>

                            <h4 className="font-bold text-sm text-base-content mb-1 truncate group-hover:text-primary transition-colors">{project.title}</h4>
                            <div className="text-[10px] text-base-content/50 font-medium mb-3">
                                {completed} / {total} Tasks Completed
                            </div>

                            <div className="w-full bg-base-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </Link>
                    )
                })}

                {projects.length === 0 && (
                    <div className="col-span-full py-8 text-center border border-dashed border-base-300 rounded-xl">
                        <span className="text-xs text-base-content/40 font-bold uppercase">No active projects</span>
                    </div>
                )}
            </div>
        </div>
    )
}
