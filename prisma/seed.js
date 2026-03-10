const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  console.log('🌱 Starting minimal seed for 5DM...')

  // Create Departments
  const departments = ['TECHNOLOGY', 'CREATIVE', 'MEDIA', 'CONTENT', 'CLIENT_SERVICE', 'BUSINESS_DEVELOPMENT', 'ACCOUNTS', 'FINANCE']
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

  // Core Users
  const users = [
    { email: 'admin@5dm.com', name: '5DM Admin', role: 'ADMIN', dept: null },
    { email: 'ceo@5dm.com', name: 'Chief Executive', role: 'CEO', dept: null },
    { email: 'hr@5dm.com', name: 'HR Manager', role: 'HR', dept: null },
    { email: 'chris@5dm.africa', name: 'Chris (Tech Head)', role: 'MANAGER', dept: 'TECHNOLOGY' },
    { email: 'finance@5dm.com', name: 'Finance Lead', role: 'FINANCE', dept: 'FINANCE' },
  ]

  for (const u of users) {
    let deptId = null
    if (u.dept) {
      const d = await prisma.department.findUnique({ where: { name: u.dept } })
      deptId = d?.id
    }

    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, departmentId: deptId },
      create: {
        email: u.email,
        name: u.name,
        password: hashedPassword,
        role: u.role,
        departmentId: deptId
      }
    })
  }

  // System Settings Branding
  const settings = [
    { key: 'SYSTEM_NAME', value: '5DM' },
    { key: 'SYSTEM_SUBTITLE', value: 'Operations Control' },
    { key: 'SYSTEM_FOOTER', value: '© 2026 5DM Africa' },
  ]

  for (const s of settings) {
    await prisma.systemSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    })
  }

  console.log('✅ Minimal seed complete: Users, Departments, and Settings initialized. No dummy data.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
