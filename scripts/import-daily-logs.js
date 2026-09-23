#!/usr/bin/env node
/**
 * Backfills General Log entries for a user at specific past dates.
 *
 * The Daily Log wizard always stamps `createdAt` with now(), so a past date
 * cannot be entered through the UI. Daily logs are stored as ActivityLog rows
 * (type COMMENTED) carrying a JSON `metadata` blob with kind "DAILY_LOG"; a
 * General Log is one with no task and no project. This writes exactly that
 * shape, with an explicit createdAt.
 *
 *   node scripts/import-daily-logs.js --file logs.json --email someone@x.com
 *   node scripts/import-daily-logs.js --file logs.json --email someone@x.com --commit
 *
 * Without --commit nothing is written: it prints what it would insert.
 *
 * The rows are indistinguishable from logs entered through the wizard: no
 * marker is written into the data. Re-running is still safe — an entry is
 * skipped if the user already has a General Log on that calendar date — and
 * every committed run writes an undo file listing the row ids it created, so a
 * batch can be reversed without a marker to search for.
 */

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const FILE = arg("file");
const EMAIL = arg("email");
const COMMIT = flag("commit");
const UNDO = arg("undo", "daily-log-import-undo.json");
// Logs land at this local time on their date. Mid-afternoon reads naturally as
// "end of working day" without colliding with midnight boundaries in any timezone.
const HOUR = Number(arg("hour", "17"));
const MINUTE = Number(arg("minute", "0"));

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

async function undoFrom(path) {
  if (!fs.existsSync(path)) fail(`Undo file not found: ${path}`);
  const { activityLogIds = [], email } = JSON.parse(fs.readFileSync(path, "utf8"));
  if (activityLogIds.length === 0) fail("Undo file lists no rows.");

  const result = await prisma.activityLog.deleteMany({ where: { id: { in: activityLogIds } } });
  console.log(`
  Deleted ${result.count} of ${activityLogIds.length} imported log(s) for ${email}.
`);
}

async function main() {
  const undoPath = arg("undo-from");
  if (undoPath) return undoFrom(undoPath);

  if (!FILE || !EMAIL) {
    fail("Usage: node scripts/import-daily-logs.js --file <entries.json> --email <user email> [--commit]");
  }
  if (!fs.existsSync(FILE)) fail(`File not found: ${FILE}`);

  const entries = JSON.parse(fs.readFileSync(FILE, "utf8"));
  if (!Array.isArray(entries) || entries.length === 0) fail("The file must contain a non-empty JSON array.");

  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!user) fail(`No user with email ${EMAIL}. Check the address on the target database.`);

  console.log(`\nTarget user : ${user.name} <${user.email}> (id ${user.id})${user.isActive ? "" : "  [INACTIVE]"}`);
  console.log(`Mode        : ${COMMIT ? "COMMIT — rows will be written" : "DRY RUN — nothing will be written"}`);
  console.log(`Entries     : ${entries.length}\n`);

  let planned = 0;
  let skipped = 0;
  const toWrite = [];

  for (const [index, entry] of entries.entries()) {
    const { date, note } = entry;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      fail(`Entry ${index + 1}: "date" must be YYYY-MM-DD, got ${JSON.stringify(date)}`);
    }
    if (!note || !note.trim()) fail(`Entry ${index + 1} (${date}): "note" is empty`);

    const [y, m, d] = date.split("-").map(Number);
    const createdAt = new Date(y, m - 1, d, HOUR, MINUTE, 0, 0);

    if (Number.isNaN(createdAt.getTime())) fail(`Entry ${index + 1}: ${date} is not a real date`);
    if (createdAt > new Date()) fail(`Entry ${index + 1}: ${date} is in the future`);

    // Re-run guard without writing a marker: does this user already have a
    // General Log on this calendar day?
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

    const existing = await prisma.activityLog.findFirst({
      where: {
        userId: user.id,
        type: "COMMENTED",
        taskId: null,
        projectId: null,
        createdAt: { gte: dayStart, lt: dayEnd },
        metadata: { contains: '"source":"PERSONAL_LOG"' },
      },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      console.log(`  skip   ${date}  a general log already exists that day (#${existing.id})`);
      continue;
    }

    const clean = note.trim();

    toWrite.push({
      type: "COMMENTED",
      description: "logged daily progress",
      taskId: null,
      projectId: null,
      userId: user.id,
      createdAt,
      metadata: JSON.stringify({
        kind: "DAILY_LOG",
        note: clean,
        markCompleted: true,
        // null projectTitle + null taskId is what makes it a General Log
        projectTitle: null,
        taskTitle: clean.slice(0, 80),
        parentTaskTitle: null,
        subtaskId: null,
        source: "PERSONAL_LOG",
      }),
    });

    planned++;
    const preview = clean.replace(/\s+/g, " ").slice(0, 88);
    console.log(`  write  ${date}  ${createdAt.toString().slice(0, 21)}  ${preview}${clean.length > 88 ? "..." : ""}`);
  }

  console.log(`\n  ${planned} to write, ${skipped} already present.`);

  if (!COMMIT) {
    console.log("\n  Dry run — nothing written. Re-run with --commit to apply.\n");
    return;
  }

  if (toWrite.length === 0) {
    console.log("\n  Nothing to do.\n");
    return;
  }

  // All or nothing, so a failure halfway cannot leave a partial week.
  const created = await prisma.$transaction(
    toWrite.map((data) => prisma.activityLog.create({ data, select: { id: true, createdAt: true } }))
  );

  // No marker is written into the rows themselves, so this file is the only
  // record of which rows came from this run — keep it if you may want to undo.
  fs.writeFileSync(
    UNDO,
    JSON.stringify(
      {
        userId: user.id,
        email: user.email,
        importedAt: new Date().toISOString(),
        activityLogIds: created.map((r) => r.id),
        dates: created.map((r) => r.createdAt.toISOString().slice(0, 10)),
      },
      null,
      2
    )
  );

  console.log(`\n  Wrote ${created.length} general log(s) for ${user.name}.`);
  console.log(`  Undo file: ${UNDO}`);
  console.log(`  To reverse: node scripts/import-daily-logs.js --undo-from ${UNDO}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
