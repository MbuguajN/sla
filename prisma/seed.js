const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Departments
  const departments = ['TECHNOLOGY', 'CREATIVE', 'MEDIA', 'CONTENT', 'CLIENT_SERVICE', 'CEO', 'BUSINESS_DEVELOPMENT', 'HR', 'ACCOUNTS']
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }

  const techDept = await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } })

  // Create Admin
  await prisma.user.upsert({
    where: { email: 'admin@nexus.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@nexus.com',
      name: 'Nexus Admin',
      password: hashedPassword,
      role: 'ADMIN',
      departmentId: techDept.id
    }
  })

  // Create Client Service
  await prisma.user.upsert({
    where: { email: 'cs@nexus.com' },
    update: { password: hashedPassword },
    create: {
      email: 'cs@nexus.com',
      name: 'James CS',
      password: hashedPassword,
      role: 'CLIENT_SERVICE',
      departmentId: (await prisma.department.findUnique({ where: { name: 'CLIENT_SERVICE' } })).id
    }
  })

  // Create Manager
  await prisma.user.upsert({
    where: { email: 'manager@nexus.com' },
    update: { password: hashedPassword },
    create: {
      role: 'MANAGER',
      departmentId: (await prisma.department.findUnique({ where: { name: 'CREATIVE' } })).id
    }
  })

  // Create Employee
  await prisma.user.upsert({
    where: { email: 'employee@nexus.com' },
    update: { password: hashedPassword },
    create: {
      email: 'employee@nexus.com',
      name: 'Alex Developer',
      password: hashedPassword,
      role: 'EMPLOYEE',
      departmentId: (await prisma.department.findUnique({ where: { name: 'TECHNOLOGY' } })).id
    }
  })

  console.log('Seed completed: All roles (ADMIN, CLIENT_SERVICE, MANAGER, EMPLOYEE) created with password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
