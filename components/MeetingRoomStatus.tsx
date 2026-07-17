"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getMeetingRooms,
  getRoomBookings,
  createBooking,
  cancelBooking,
  cancelBookingSeries,
} from "@/app/actions/meetingRoomActions";
import {
  DoorOpen,
  Clock,
  User,
  X,
  ChevronDown,
  Calendar,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";

type RoomData = {
  id: number;
  name: string;
  location: string | null;
  currentBooking: {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    bookedBy: { id: number; name: string };
  } | null;
};

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getRoomStatusColor(room: RoomData) {
  if (!room.currentBooking) return "text-emerald-500";
  const now = new Date();
  const end = new Date(room.currentBooking.endTime);
  const minutesLeft = (end.getTime() - now.getTime()) / 60000;
  if (minutesLeft <= 15) return "text-amber-500";
  return "text-red-500";
}

function getRoomStatusBg(room: RoomData) {
  if (!room.currentBooking) return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30";
  const now = new Date();
  const end = new Date(room.currentBooking.endTime);
  const minutesLeft = (end.getTime() - now.getTime()) / 60000;
  if (minutesLeft <= 15) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30";
}

function getRoomStatusDot(room: RoomData) {
  if (!room.currentBooking) return "bg-emerald-500";
  const now = new Date();
  const end = new Date(room.currentBooking.endTime);
  const minutesLeft = (end.getTime() - now.getTime()) / 60000;
  if (minutesLeft <= 15) return "bg-amber-500 animate-pulse";
  return "bg-red-500";
}

function getRoomStatusLabel(room: RoomData) {
  if (!room.currentBooking) return "FREE";
  const now = new Date();
  const end = new Date(room.currentBooking.endTime);
  const minutesLeft = (end.getTime() - now.getTime()) / 60000;
  if (minutesLeft <= 15) return "ENDING SOON";
  return "OCCUPIED";
}

export default function MeetingRoomStatus() {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking form state
  const [bookTitle, setBookTitle] = useState("");
  const [bookDate, setBookDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookStart, setBookStart] = useState("09:00");
  const [bookEnd, setBookEnd] = useState("10:00");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("WEEKLY");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const hoverRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popupRef.current && !popupRef.current.contains(target)) {
        setSelectedRoom(null);
        setShowBookingForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadRooms() {
    try {
      const data = await getMeetingRooms();
      setRooms(data as RoomData[]);
    } catch (err) {
      console.error("Failed to load meeting rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoomClick(room: RoomData) {
    setSelectedRoom(room);
    setShowBookingForm(false);
    setError("");
    setBookTitle("");
    setBookDate(new Date().toISOString().split("T")[0]);
    setBookStart("09:00");
    setBookEnd("10:00");
    setIsRecurring(false);
    setRecurrenceType("WEEKLY");
    setRecurrenceEndDate("");

    setLoadingBookings(true);
    try {
      const data = await getRoomBookings(room.id, new Date().toISOString().split("T")[0]);
      setBookings(data);
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  }

  async function handleBook() {
    if (!selectedRoom || !bookTitle.trim() || !bookDate || !bookStart || !bookEnd) return;

    setBooking(true);
    setError("");

    const startDateTime = new Date(`${bookDate}T${bookStart}`);
    const endDateTime = new Date(`${bookDate}T${bookEnd}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError("Invalid date or time entered");
      setBooking(false);
      return;
    }

    if (endDateTime <= startDateTime) {
      setError("End time must be after start time");
      setBooking(false);
      return;
    }

    const diffMinutes = (endDateTime.getTime() - startDateTime.getTime()) / 60000;
    if (diffMinutes < 15) {
      setError("Booking must be at least 15 minutes long");
      setBooking(false);
      return;
    }

    try {
      const result = await createBooking({
        roomId: selectedRoom.id,
        title: bookTitle.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
      });
      await handleRoomClick(selectedRoom);
      await loadRooms();
      setShowBookingForm(false);
    } catch (err: any) {
      console.error("Booking failed:", err);
      const msg = err?.message || err?.digest?.split(":?.*")[1] || "Failed to book room";
      setError(msg);
    } finally {
      setBooking(false);
    }
  }

  async function handleCancelBooking(bookingId: number) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      if (selectedRoom) await handleRoomClick(selectedRoom);
      await loadRooms();
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking");
    }
  }

  async function handleCancelSeries(groupId: string) {
    if (!confirm("Cancel all recurring bookings in this series?")) return;
    try {
      await cancelBookingSeries(groupId);
      if (selectedRoom) await handleRoomClick(selectedRoom);
      await loadRooms();
    } catch (err: any) {
      alert(err.message || "Failed to cancel series");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="font-bold">Rooms</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={popupRef}>
      {/* Room indicators */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mr-1">
          Rooms
        </span>
        {rooms.map((room) => (
          <div
            key={room.id}
            className="relative"
            onMouseEnter={() => setHoveredRoom(room.id)}
            onMouseLeave={() => setHoveredRoom(null)}
          >
            <button
              onClick={() => handleRoomClick(room)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-md",
                getRoomStatusBg(room),
                selectedRoom?.id === room.id && "ring-2 ring-[#c91f41] ring-offset-1"
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", getRoomStatusDot(room))} />
              <DoorOpen className={cn("h-3.5 w-3.5", getRoomStatusColor(room))} />
              <span className={cn("text-[10px] font-black uppercase tracking-wider", getRoomStatusColor(room))}>
                {room.name}
              </span>
              <span className={cn("text-[9px] font-bold", getRoomStatusColor(room))}>
                {getRoomStatusLabel(room)}
              </span>
            </button>

            {/* Hover tooltip */}
            {hoveredRoom === room.id && !selectedRoom && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-zinc-800 dark:text-white">{room.name}</h4>
                  <div className={cn("h-2.5 w-2.5 rounded-full", getRoomStatusDot(room))} />
                </div>
                {room.location && (
                  <p className="text-[10px] font-bold text-zinc-400 mb-2">{room.location}</p>
                )}
                {room.currentBooking ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <User className="h-3 w-3" />
                      <span className="font-semibold">{room.currentBooking.bookedBy.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <Calendar className="h-3 w-3" />
                      <span className="font-semibold">{room.currentBooking.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>Until {formatTime(room.currentBooking.endTime)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Available now</p>
                )}
                <button
                  onClick={() => handleRoomClick(room)}
                  className="w-full mt-3 py-2 rounded-lg bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#a01832] transition-all"
                >
                  {room.currentBooking ? "View Details" : "Book Now"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Room detail / booking popup */}
      {selectedRoom && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[420px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className={cn("px-5 py-4 border-b border-zinc-200 dark:border-white/10", getRoomStatusBg(selectedRoom))}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", getRoomStatusDot(selectedRoom))} />
                <div>
                  <h3 className="text-sm font-black text-zinc-800 dark:text-white">{selectedRoom.name}</h3>
                  <p className={cn("text-[10px] font-black uppercase tracking-wider", getRoomStatusColor(selectedRoom))}>
                    {getRoomStatusLabel(selectedRoom)}
                    {selectedRoom.currentBooking && (
                      <span className="ml-2 font-bold normal-case tracking-normal">
                        until {formatTime(selectedRoom.currentBooking.endTime)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!showBookingForm && (
                  <button
                    onClick={() => setShowBookingForm(true)}
                    className="h-8 px-3 rounded-lg bg-[#c91f41] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#a01832] transition-all"
                  >
                    Book
                  </button>
                )}
                <button
                  onClick={() => { setSelectedRoom(null); setShowBookingForm(false); }}
                  className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center justify-center text-zinc-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Booking form */}
          {showBookingForm && (
            <div className="px-5 py-4 bg-zinc-50 dark:bg-white/5 border-b border-zinc-200 dark:border-white/10">
              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg text-xs text-red-600 dark:text-red-400 font-bold">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Meeting title"
                  className="w-full h-10 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl text-sm font-bold text-zinc-800 dark:text-white placeholder-zinc-400 outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                  />
                  <input
                    type="time"
                    value={bookStart}
                    onChange={(e) => setBookStart(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                  />
                  <input
                    type="time"
                    value={bookEnd}
                    onChange={(e) => setBookEnd(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-[#c91f41] focus:ring-2 focus:ring-[#c91f41]/10 transition-all"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-[#c91f41] focus:ring-[#c91f41]"
                    />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Recurring</span>
                  </label>
                  {isRecurring && (
                    <>
                      <select
                        value={recurrenceType}
                        onChange={(e) => setRecurrenceType(e.target.value)}
                        className="h-8 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-lg text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-[#c91f41] transition-all"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Biweekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        placeholder="End date"
                        className="h-8 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-lg text-xs font-bold text-zinc-800 dark:text-white outline-none focus:border-[#c91f41] transition-all"
                      />
                    </>
                  )}
                </div>
                <button
                  onClick={handleBook}
                  disabled={!bookTitle.trim() || booking}
                  className="w-full h-10 bg-[#c91f41] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#a01832] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  {booking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {booking ? "Booking..." : "Book Room"}
                </button>
              </div>
            </div>
          )}

          {/* Today's bookings */}
          <div className="px-5 py-4 max-h-[300px] overflow-y-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              Today&apos;s Bookings
            </h4>
            {loadingBookings ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No bookings today</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-zinc-800 dark:text-white">
                          {formatTime(b.startTime)}
                        </span>
                        <span className="text-[9px] text-zinc-400">to</span>
                        <span className="text-xs font-black text-zinc-800 dark:text-white">
                          {formatTime(b.endTime)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-white truncate">{b.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{b.bookedBy.name}</p>
                        {b.isRecurring && (
                          <div className="flex items-center gap-1 mt-1">
                            <RefreshCw className="h-2.5 w-2.5 text-[#c91f41]" />
                            <span className="text-[9px] font-bold text-[#c91f41] uppercase">
                              {b.recurrenceType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {b.isRecurring && b.recurrenceGroupId && (
                        <button
                          onClick={() => handleCancelSeries(b.recurrenceGroupId)}
                          className="h-7 px-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"
                          title="Cancel entire series"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="h-7 px-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                        title="Cancel booking"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
