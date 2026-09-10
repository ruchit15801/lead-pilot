import { nextAvailableSlot } from "../domain/calendar";
import { NotFoundError } from "../lib/errors";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";
import { createCalendarEvent } from "./googleService";

export async function listMeetings() {
  const db = await loadDb();
  return db.meetings
    .filter((meeting) => meeting.status === "booked")
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((meeting) => {
      const lead = db.leads.find((item) => item.id === meeting.leadId);
      return {
        ...meeting,
        leadName: lead?.name,
        company: lead?.company,
        service: lead?.service,
      };
    });
}

export async function bookMeeting(leadId: string, slot?: string) {
  return mutate(async (db) => {
    const lead = db.leads.find((item) => item.id === leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    const when = slot ? new Date(slot) : nextAvailableSlot(db.meetings, 30);
    const title = `Axoryte x ${lead.company}`;
    const calendar = await createCalendarEvent({
      title,
      slot: when,
      durationMinutes: 30,
      attendee: lead.email,
    });
    const meeting = {
      id: newId(),
      leadId,
      title,
      slot: when.toISOString(),
      durationMinutes: 30,
      calendarEventId: calendar.calendarEventId,
      status: "booked" as const,
      createdAt: nowIso(),
    };
    db.meetings.unshift(meeting);
    lead.status = "meeting_booked";
    lead.paused = true;
    lead.nextFollowUpAt = undefined;
    lead.updatedAt = nowIso();
    db.activities.unshift({
      id: newId(),
      type: "meeting",
      text: `Meeting booked with ${lead.name}`,
      leadId,
      createdAt: nowIso(),
    });
    return meeting;
  });
}
