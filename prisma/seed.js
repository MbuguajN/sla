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

  // Set Tech Head
  await prisma.department.update({
    where: { id: techDept.id },
    data: { headId: admin.id }
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

  console.log('Seed completed: Roles (ADMIN, CEO, HR, MANAGER, EMPLOYEE) created with department heads assigned.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
