import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Prisma } from "@prisma/client";
import { getCurrentUser, canManageUsers } from "@/lib/permissions";
import db from "@/lib/db";

function formatLocation(location: string | null, ipAddress: string | null) {
  if (location && ipAddress) return `${location} (${ipAddress})`;
  if (location) return location;
  if (ipAddress) return ipAddress;
  return "Unavailable";
}

function formatTimestamp(timestamp: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

async function getLoginAttempts(status: "SUCCESS" | "FAILED") {
  try {
    return await db.loginAttempt.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return [];
    }

    throw error;
  }
}

export default async function AdminLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageUsers(user)) redirect("/dashboard");

  const [recentLogins, failedAttempts] = await Promise.all([
    getLoginAttempts("SUCCESS"),
    getLoginAttempts("FAILED"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Login Logs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Track successful sign-ins and failed login attempts with email, IP address, and location.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm dark:border-white/10 dark:bg-[#111111] dark:shadow-none">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-zinc-500">Records Loaded</p>
          <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{recentLogins.length + failedAttempts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-black dark:shadow-none">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Successful Logins</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Account, time, IP address and location</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{recentLogins.length}</span>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {recentLogins.length === 0 ? (
              <EmptyState label="No successful login records yet." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {recentLogins.map((attempt) => (
                  <article key={attempt.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                          {attempt.user?.name || attempt.email}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-zinc-400">
                          {attempt.user?.email || attempt.email}
                          {attempt.user?.role ? ` • ${attempt.user.role}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Success
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-zinc-300 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Time</p>
                        <p className="mt-1 font-medium">{formatTimestamp(attempt.createdAt)}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{formatDistanceToNow(attempt.createdAt, { addSuffix: true })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">IP / Location</p>
                        <p className="mt-1 font-medium">{formatLocation(attempt.location, attempt.ipAddress)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-black dark:shadow-none">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Failed Login Attempts</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#c91f41]">Account email, time, IP address and location</p>
              </div>
              <span className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-black text-[#c91f41] dark:bg-[#c91f41]/10 dark:text-[#ff9eb1]">{failedAttempts.length}</span>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {failedAttempts.length === 0 ? (
              <EmptyState label="No failed login attempts recorded." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {failedAttempts.map((attempt) => (
                  <article key={attempt.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">{attempt.email}</p>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-zinc-400">
                          {attempt.user?.name ? `${attempt.user.name} • ` : ""}
                          {attempt.failureReason || "Login failed"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#fff1f2] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#c91f41] dark:bg-[#c91f41]/10 dark:text-[#ff9eb1]">
                        Failed
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-zinc-300 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">Time</p>
                        <p className="mt-1 font-medium">{formatTimestamp(attempt.createdAt)}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{formatDistanceToNow(attempt.createdAt, { addSuffix: true })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-zinc-500">IP / Location</p>
                        <p className="mt-1 font-medium">{formatLocation(attempt.location, attempt.ipAddress)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}