const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Departments
  const departments = ['TECHNOLOGY', 'CREATIVE', 'MEDIA', 'CONTENT', 'CLIENT_SERVICE', 'BUSINESS_DEVELOPMENT', 'HR', 'ACCOUNTS']
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
    update: { password: hashedPassword, role: 'MANAGER' },
    create: {
      email: 'admin@nexus.com',
      name: 'Nexus Admin',
      password: hashedPassword,
      role: 'MANAGER',
      departmentId: techDept.id
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
    update: { password: hashedPassword, role: 'MANAGER' },
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

  // Create CEO
  await prisma.user.upsert({
    where: { email: 'ceo@nexus.com' },
    update: { password: hashedPassword, role: 'CEO' },
    create: {
      email: 'ceo@nexus.com',
      name: 'Chief Executive',
      password: hashedPassword,
      role: 'CEO',
    }
  })

  // Create Manager
  const creativeManager = await prisma.user.upsert({
    where: { email: 'manager@nexus.com' },
    update: { password: hashedPassword, role: 'MANAGER' },
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
    update: { password: hashedPassword, role: 'EMPLOYEE' },
    create: {
      email: 'employee@nexus.com',
      name: 'Alex Developer',
      password: hashedPassword,
      role: 'EMPLOYEE',
      departmentId: techDept.id
    }
  })

  console.log('Seed completed: Roles (CEO, MANAGER, EMPLOYEE) created with department heads assigned.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
