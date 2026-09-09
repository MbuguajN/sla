#!/usr/bin/env node
/**
 * Carries UserPrivilege data across the removal of the privilege system.
 *
 * `prisma db push` drops UserPrivilege (and drops ANY table absent from the
 * schema, so an in-database archive would not survive either). Run this before
 * the push to write the rows to a file, and again after to restore the grants
 * that still have a home.
 *
 *   node scripts/migrate-privileges.js export   # BEFORE npx prisma db push
 *   node scripts/migrate-privileges.js restore  # AFTER  npx prisma db push
 *
 * CAN_VIEW_EMPLOYEES is restored into the new EmployeeDirectoryViewer table.
 * The other three privileges no longer exist by design — they are kept in the
 * export file for the record, and reported so you can re-grant by role or
 * department if anyone was relying on them.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const FILE = path.join(process.cwd(), "user-privileges-backup.json");
const prisma = new PrismaClient();

async function exportGrants() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT up."userId", up.privilege::text AS privilege, up."grantedById",
           u.email, u.name, u.role, d.slug AS department
    FROM "UserPrivilege" up
    JOIN "User" u ON u.id = up."userId"
    LEFT JOIN "Department" d ON d.id = u."departmentId"
    ORDER BY u.name
  `);

  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));
  console.log(`Exported ${rows.length} grant(s) to ${FILE}`);

  if (rows.length === 0) {
    console.log("Nothing to preserve — the push will drop an empty table.");
    return;
  }

  const byPrivilege = {};
  for (const r of rows) (byPrivilege[r.privilege] ||= []).push(`${r.name} <${r.email}>`);

  for (const [priv, people] of Object.entries(byPrivilege)) {
    const fate =
      priv === "CAN_VIEW_EMPLOYEES"
        ? "will be restored automatically"
        : "NOT restorable — re-grant via role/department if still needed";
    console.log(`\n  ${priv} (${people.length}) — ${fate}`);
    for (const p of people) console.log(`    - ${p}`);
  }
}

async function restoreGrants() {
  if (!fs.existsSync(FILE)) {
    console.error(`No export found at ${FILE}. Run "export" before pushing the schema.`);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const directory = rows.filter((r) => r.privilege === "CAN_VIEW_EMPLOYEES");

  let restored = 0;
  let skipped = 0;

  for (const row of directory) {
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true } });
    if (!user) {
      console.warn(`  skipped ${row.email} — user no longer exists`);
      skipped++;
      continue;
    }

    // grantedById may point at a deleted user; the column is nullable.
    const granter = row.grantedById
      ? await prisma.user.findUnique({ where: { id: row.grantedById }, select: { id: true } })
      : null;

    await prisma.employeeDirectoryViewer.upsert({
      where: { userId: row.userId },
      update: {},
      create: { userId: row.userId, grantedById: granter?.id ?? null },
    });
    restored++;
  }

  console.log(`Restored ${restored} directory grant(s)${skipped ? `, skipped ${skipped}` : ""}.`);

  const dropped = rows.filter((r) => r.privilege !== "CAN_VIEW_EMPLOYEES");
  if (dropped.length > 0) {
    console.log(`\n${dropped.length} grant(s) were not restorable (privilege removed by design):`);
    for (const r of dropped) console.log(`  - ${r.name} <${r.email}> : ${r.privilege}`);
    console.log("\nThese users keep access only if their role/department already allows it.");
  }
}

const mode = process.argv[2];

(async () => {
  if (mode === "export") await exportGrants();
  else if (mode === "restore") await restoreGrants();
  else {
    console.error("Usage: node scripts/migrate-privileges.js <export|restore>");
    process.exit(1);
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
