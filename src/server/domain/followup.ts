export const DEFAULT_SEQUENCE = [
  { index: 0, dayOffset: 0, channel: "email" as const, label: "Initial" },
  { index: 1, dayOffset: 3, channel: "email" as const, label: "Follow-up 1" },
  { index: 2, dayOffset: 7, channel: "whatsapp" as const, label: "Follow-up 2" },
  { index: 3, dayOffset: 14, channel: "email" as const, label: "Final" },
];

export function delaySeconds(
  dayOffset: number,
  random: () => number = Math.random,
): number {
  // Day 0 uses a short jitter so campaign start actually sends quickly.
  // Later steps follow the spec: dayOffset * 86400 + random(0, 3600).
  const jitter = dayOffset === 0 ? random() * 15 : random() * 3600;
  return dayOffset * 86_400 + jitter;
}

export function nextFollowUpAt(
  from: Date,
  dayOffset: number,
  random?: () => number,
): Date {
  return new Date(from.getTime() + delaySeconds(dayOffset, random) * 1000);
}

export function shouldStopSequence(status: string, stepIndex: number) {
  return status === "replied" || status === "meeting_booked" || status === "lost" || stepIndex > 3;
}
