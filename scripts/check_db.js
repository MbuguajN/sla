const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main(){
  const departments = await prisma.department.findMany()
  const slas = await prisma.sla.findMany()
  const users = await prisma.user.findMany()
  console.log('departments', departments.map(d=>d.name))
  console.log('slas', slas.map(s=>({name:s.name,durationHrs:s.durationHrs,tier:s.tier})))
  console.log('users', users.map(u=>({email:u.email,name:u.name,role:u.role})))
  await prisma.$disconnect()
}

main().catch(e=>{console.error(e);process.exit(1)})
