import React from 'react'
import prisma from '@/lib/db'
import Link from 'next/link'
import { FolderGit2, ArrowUpRight } from 'lucide-react'
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
                <h3 className="text-sm font-semibold text-base-content">Active Projects</h3>
                <Link href="/projects" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => {
                    const total = project.tasks.length
                    const completed = project.tasks.filter(t => t.status === TaskStatus.COMPLETED).length
                    const progress = total > 0 ? (completed / total) * 100 : 0

                    return (
                        <Link key={project.id} href={`/projects/${project.id}`} className="group bg-base-100 border border-base-200 p-5 rounded-xl hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-9 h-9 bg-base-200 rounded-lg flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <FolderGit2 className="w-4 h-4" />
                                </div>
                                <span className="text-xs text-base-content/25">#{project.id}</span>
                            </div>

                            <h4 className="font-medium text-sm text-base-content mb-1 truncate">{project.title}</h4>
                            <p className="text-xs text-base-content/40 mb-4">
                                {completed} of {total} tasks completed
                            </p>

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
                    <div className="col-span-full py-12 text-center border border-dashed border-base-200 rounded-xl">
                        <span className="text-sm text-base-content/30">No active projects</span>
                    </div>
                )}
            </div>
        </div>
    )
}
