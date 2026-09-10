import type { LeadStatus } from "./types";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  review: "Review",
  queued: "Queued",
  needs_research: "Needs research",
  contacted: "Contacted",
  replied: "Replied",
  meeting_booked: "Booked",
  paused: "Paused",
  lost: "Lost",
  discarded: "Discarded",
};

export const STATUS_CLASS: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  queued: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  needs_research: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  replied: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  meeting_booked: "bg-emerald-600 text-white",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  lost: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  discarded: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
