import type { LeadStatus } from "@/lib/types";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function ServiceLabel({ service }: { service?: string }) {
  if (!service) return <span className="text-slate-500">Unassigned</span>;
  return <span className="text-slate-900 dark:text-slate-100">{service}</span>;
}

export function ChannelMark({ channel }: { channel: "email" | "whatsapp" | null }) {
  if (!channel) return <span className="text-slate-400">—</span>;
  return (
    <span className={cn("font-medium", channel === "email" ? "text-indigo-700 dark:text-indigo-300" : "text-emerald-700 dark:text-emerald-300")}>
      {channel === "email" ? "Email" : "WhatsApp"}
    </span>
  );
}
