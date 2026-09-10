import type { Meeting } from "../../lib/types";

const SLOT_MINUTES = 30;
const DAY_START_HOUR = 10;
const DAY_END_HOUR = 17;

export function nextAvailableSlot(
  existing: Pick<Meeting, "slot" | "durationMinutes" | "status">[],
  durationMinutes = SLOT_MINUTES,
  from = new Date(),
  timeZone = "Asia/Kolkata",
): Date {
  const occupied = existing
    .filter((meeting) => meeting.status === "booked")
    .map((meeting) => {
      const start = new Date(meeting.slot).getTime();
      return { start, end: start + meeting.durationMinutes * 60_000 };
    });

  const cursor = new Date(from.getTime() + 60 * 60_000);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() < 30 ? 30 : 60, 0, 0);

  for (let i = 0; i < 60 * 24; i += 1) {
    const local = zonedParts(cursor, timeZone);
    const weekday = local.weekday;
    const minutes = local.hour * 60 + local.minute;
    const startBound = DAY_START_HOUR * 60;
    const endBound = DAY_END_HOUR * 60;
    const slotEnd = minutes + durationMinutes;

    const isWeekday = weekday >= 1 && weekday <= 5;
    const inHours = minutes >= startBound && slotEnd <= endBound;
    const overlaps = occupied.some((block) => {
      const start = cursor.getTime();
      const end = start + durationMinutes * 60_000;
      return start < block.end && end > block.start;
    });

    if (isWeekday && inHours && !overlaps) {
      return new Date(cursor);
    }

    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }

  return cursor;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekdayName = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[weekdayName] ?? 1,
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "10"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}
