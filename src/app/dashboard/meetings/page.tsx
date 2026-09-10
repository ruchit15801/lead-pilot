"use client";

import { ServiceLabel } from "@/components/leads/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type { Meeting, ServiceTarget } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Row = Meeting & { leadName?: string; company?: string; service?: ServiceTarget };

export default function MeetingsPage() {
  const { data, error } = useApi<Row[]>("/meetings", 8000);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Upcoming meetings</h1>
        <p className="text-sm text-slate-500">Auto-booked from positive replies, plus manual bookings.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Service</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((meeting) => (
              <tr key={meeting.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 tabular-nums">{formatDate(meeting.slot, true)}</td>
                <td className="px-4 py-3">{meeting.leadName}</td>
                <td className="px-4 py-3">{meeting.company}</td>
                <td className="px-4 py-3">
                  <ServiceLabel service={meeting.service} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {(data ?? []).map((meeting) => (
          <Card key={meeting.id}>
            <CardContent className="p-4 text-sm">
              <div className="font-medium">{meeting.leadName}</div>
              <div className="text-slate-500">{meeting.company}</div>
              <div className="mt-1 tabular-nums">{formatDate(meeting.slot, true)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
