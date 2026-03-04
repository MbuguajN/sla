const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Departments
  const departments = ['TECHNOLOGY', 'CREATIVE', 'MEDIA', 'CONTENT', 'CLIENT_SERVICE', 'BUSINESS_DEVELOPMENT', 'ACCOUNTS']
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  const techDept = await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } })
  const csDept = await prisma.department.findUnique({ where: { name: 'CLIENT_SERVICE' } })
  const creativeDept = await prisma.department.findUnique({ where: { name: 'CREATIVE' } })

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: { role: 'ADMIN', departmentId: null },
    create: {
      email: 'admin@nexus.com',
      name: 'Nexus Admin',
      password: hashedPassword,
      role: 'ADMIN',
      departmentId: null
    }
  })

  // Create CEO
  await prisma.user.upsert({
    where: { email: 'ceo@nexus.com' },
    update: { role: 'CEO' },
    create: {
      email: 'ceo@nexus.com',
      name: 'Chief Executive',
      password: hashedPassword,
      role: 'CEO',
    }
  })

  // Create HR
  await prisma.user.upsert({
    where: { email: 'hr@nexus.com' },
    update: { role: 'HR' },
    create: {
      email: 'hr@nexus.com',
      name: 'HR Manager',
      password: hashedPassword,
      role: 'HR',
    }
  })

  // Create Technology Head
  const technologyHead = await prisma.user.upsert({
    where: { email: 'chris@5dm.africa' },
    update: { role: 'MANAGER' },
    create: {
      email: 'chris@5dm.africa',
      name: 'Chris',
      password: hashedPassword,
      role: 'MANAGER',
      departmentId: techDept.id
    }
  })

  // Set Tech Head
  await prisma.department.update({
    where: { id: techDept.id },
    data: { headId: technologyHead.id }
  })

  // Create Client Service Head
  const csHead = await prisma.user.upsert({
    where: { email: 'cs@nexus.com' },
    update: { role: 'MANAGER' },
    create: {
      email: 'cs@nexus.com',
      name: 'James CS',
      password: hashedPassword,
      role: 'MANAGER',
      departmentId: csDept.id
    }
  })

  await prisma.department.update({
    where: { id: csDept.id },
    data: { headId: csHead.id }
  })

  // Create Manager
  const creativeManager = await prisma.user.upsert({
    where: { email: 'manager@nexus.com' },
    update: { role: 'MANAGER' },
    create: {
      email: 'manager@nexus.com',
      name: 'Manager Creative',
      password: hashedPassword,
      role: 'MANAGER',
      departmentId: creativeDept.id
    }
  })

  await prisma.department.update({
    where: { id: creativeDept.id },
    data: { headId: creativeManager.id }
  })

  // Create Employee
  await prisma.user.upsert({
    where: { email: 'employee@nexus.com' },
    update: { role: 'EMPLOYEE' },
    create: {
      email: 'employee@nexus.com',
      name: 'Alex Developer',
      password: hashedPassword,
      role: 'EMPLOYEE',
      departmentId: techDept.id
    }
  })

  // Create SLAs (Robust check)
  const slaTemplates = [
    { name: 'Standard', durationHrs: 48, tier: 'BRONZE' },
    { name: 'Urgent', durationHrs: 24, tier: 'SILVER' },
    { name: 'Critical', durationHrs: 4, tier: 'GOLD' }
  ]

  for (const template of slaTemplates) {
    const existing = await prisma.sla.findFirst({ where: { name: template.name } })
    if (!existing) {
      await prisma.sla.create({ data: template })
    }
  }

  const standardSla = await prisma.sla.findFirst({ where: { name: 'Standard' } })
  const bdDept = await prisma.department.findUnique({ where: { name: 'BUSINESS_DEVELOPMENT' } })

  // Create Business Development User
  const bdUser = await prisma.user.upsert({
    where: { email: 'bd@nexus.com' },
    update: { role: 'EMPLOYEE' },
    create: {
      email: 'bd@nexus.com',
      name: 'BD Agent',
      password: hashedPassword,
      role: 'EMPLOYEE',
      departmentId: bdDept.id
    }
  })

  // Create a Main Project (created by BD)
  const mainProject = await prisma.project.create({
    data: {
      title: 'Global Branding Campaign 2024',
      description: 'Strategic overhaul of global brand identity across all touchpoints.',
      status: 'ACTIVE',
      createdById: bdUser.id,
      defaultSlaId: standardSla.id
    }
  })

  // Create Sub-Projects (created by CS)
  const subProject1 = await prisma.subProject.create({
    data: {
      title: 'Digital Social Strategy',
      description: 'Defining presence on TikTok, Instagram, and LinkedIn.',
      projectId: mainProject.id,
      createdById: csHead.id,
      status: 'ACTIVE'
    }
  })

  const subProject2 = await prisma.subProject.create({
    data: {
      title: 'Physical Activation Events',
      description: 'Pop-up stores and billboard placements.',
      projectId: mainProject.id,
      createdById: csHead.id,
      status: 'ON_HOLD'
    }
  })

  // Create a Sublet (created by CS)
  const sublet1 = await prisma.subProject.create({
    data: {
      title: 'TikTok Content Production',
      description: 'High-energy vertical video assets for TikTok ads.',
      projectId: mainProject.id,
      parentId: subProject1.id,
      createdById: csHead.id,
      status: 'ACTIVE'
    }
  })

  // Create Tasks at different levels
  await prisma.task.create({
    data: {
      title: 'Finalize Campaign Moodboards',
      description: 'Creative direction validation for the global campaign.',
      status: 'IN_PROGRESS',
      slaId: standardSla.id,
      departmentId: creativeDept.id,
      reporterId: csHead.id,
      projectId: mainProject.id,
      assigneeId: creativeManager.id,
      dueAt: new Date(Date.now() + 86400000)
    }
  })

  await prisma.task.create({
    data: {
      title: 'Script 5x TikTok Clips',
      description: 'Drafting viral-loop scripts for the social launch.',
      status: 'PENDING',
      slaId: standardSla.id,
      departmentId: creativeDept.id,
      reporterId: csHead.id,
      subProjectId: sublet1.id,
      dueAt: new Date(Date.now() + 172800000)
    }
  })

  console.log('Seed completed: Hierarchical projects, sub-projects, sublets, and tasks created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
