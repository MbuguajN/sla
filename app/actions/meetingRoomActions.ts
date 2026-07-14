"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getMeetingRooms() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date();

  const rooms = await db.meetingRoom.findMany({
    where: { isActive: true },
    include: {
      bookings: {
        where: {
          startTime: { lte: now },
          endTime: { gt: now },
        },
        take: 1,
        include: { bookedBy: { select: { id: true, name: true } } },
        orderBy: { startTime: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    location: room.location,
    currentBooking: room.bookings[0]
      ? {
          id: room.bookings[0].id,
          title: room.bookings[0].title,
          startTime: room.bookings[0].startTime.toISOString(),
          endTime: room.bookings[0].endTime.toISOString(),
          bookedBy: room.bookings[0].bookedBy,
        }
      : null,
  }));
}

export async function createMeetingRoom(name: string, location?: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new Error("Unauthorized - Only admins and managers can create rooms");
  }

  const existing = await db.meetingRoom.findUnique({ where: { name } });
  if (existing) throw new Error("A room with this name already exists");

  const room = await db.meetingRoom.create({
    data: {
      name: name.trim(),
      location: location?.trim() || null,
      createdBy: user.id,
    },
  });

  revalidatePath("/");
  return room;
}

export async function updateMeetingRoom(id: number, data: { name?: string; location?: string; isActive?: boolean }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new Error("Unauthorized");
  }

  if (data.name) {
    const existing = await db.meetingRoom.findFirst({ where: { name: data.name, id: { not: id } } });
    if (existing) throw new Error("A room with this name already exists");
  }

  const room = await db.meetingRoom.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.location !== undefined && { location: data.location?.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath("/");
  return room;
}

export async function deleteMeetingRoom(id: number) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new Error("Unauthorized");
  }

  await db.meetingRoom.delete({ where: { id } });
  revalidatePath("/");
}

export async function getRoomBookings(roomId: number, date: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await db.meetingBooking.findMany({
    where: {
      roomId,
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
    include: { bookedBy: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    title: b.title,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    bookedBy: b.bookedBy,
    isRecurring: b.isRecurring,
    recurrenceType: b.recurrenceType,
    recurrenceGroupId: b.recurrenceGroupId,
  }));
}

export async function createBooking(data: {
  roomId: number;
  title: string;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceEndDate?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) throw new Error("End time must be after start time");

  // Check for conflicts
  const conflict = await db.meetingBooking.findFirst({
    where: {
      roomId: data.roomId,
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) throw new Error("This room is already booked for the selected time");

  const recurrenceGroupId = data.isRecurring ? `rg-${Date.now()}-${user.id}` : null;

  // Create the first booking
  const booking = await db.meetingBooking.create({
    data: {
      roomId: data.roomId,
      bookedByUserId: user.id,
      title: data.title.trim(),
      startTime: start,
      endTime: end,
      isRecurring: data.isRecurring || false,
      recurrenceType: data.recurrenceType || null,
      recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
      recurrenceGroupId,
    },
  });

  // If recurring, create future occurrences
  if (data.isRecurring && data.recurrenceType && data.recurrenceEndDate) {
    const recurrences = generateRecurrences(
      start,
      end,
      data.recurrenceType,
      new Date(data.recurrenceEndDate)
    );

    for (const rec of recurrences) {
      // Check conflict for each occurrence
      const recConflict = await db.meetingBooking.findFirst({
        where: {
          roomId: data.roomId,
          startTime: { lt: rec.end },
          endTime: { gt: rec.start },
        },
      });

      if (!recConflict) {
        await db.meetingBooking.create({
          data: {
            roomId: data.roomId,
            bookedByUserId: user.id,
            title: data.title.trim(),
            startTime: rec.start,
            endTime: rec.end,
            isRecurring: true,
            recurrenceType: data.recurrenceType,
            recurrenceEndDate: new Date(data.recurrenceEndDate),
            recurrenceGroupId,
          },
        });
      }
    }
  }

  revalidatePath("/");
  return booking;
}

export async function cancelBooking(bookingId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const booking = await db.meetingBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found");

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  if (booking.bookedByUserId !== user.id && !isAdmin) {
    throw new Error("Unauthorized - You can only cancel your own bookings");
  }

  await db.meetingBooking.delete({ where: { id: bookingId } });
  revalidatePath("/");
}

export async function cancelBookingSeries(recurrenceGroupId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const bookings = await db.meetingBooking.findMany({
    where: { recurrenceGroupId },
  });

  if (bookings.length === 0) throw new Error("No bookings found in this series");

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";
  const allOwn = bookings.every((b) => b.bookedByUserId === user.id);
  if (!allOwn && !isAdmin) {
    throw new Error("Unauthorized");
  }

  await db.meetingBooking.deleteMany({ where: { recurrenceGroupId } });
  revalidatePath("/");
}

export async function getAllRoomBookings(date: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await db.meetingBooking.findMany({
    where: {
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
    include: {
      room: { select: { id: true, name: true } },
      bookedBy: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return bookings.map((b) => ({
    ...b,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    recurrenceEndDate: b.recurrenceEndDate?.toISOString() || null,
  }));
}

function generateRecurrences(
  start: Date,
  end: Date,
  type: string,
  endDate: Date
): { start: Date; end: Date }[] {
  const recurrences: { start: Date; end: Date }[] = [];
  const duration = end.getTime() - start.getTime();
  let current = new Date(start);

  while (true) {
    if (type === "WEEKLY") current.setDate(current.getDate() + 7);
    else if (type === "BIWEEKLY") current.setDate(current.getDate() + 14);
    else if (type === "MONTHLY") current.setMonth(current.getMonth() + 1);
    else break;

    if (current > endDate) break;

    recurrences.push({
      start: new Date(current),
      end: new Date(current.getTime() + duration),
    });
  }

  return recurrences;
}
