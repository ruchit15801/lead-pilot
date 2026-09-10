"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { Campaign } from "@/lib/types";

type CampaignRow = Campaign & { leads: number; replied: number; booked: number };

export default function CampaignsPage() {
  const { data, refetch, error } = useApi<CampaignRow[]>("/campaigns");

  async function toggle(id: string, status: Campaign["status"]) {
    try {
      await api(`/campaigns/${id}`, { method: "PATCH", body: { status } });
      toast.success(`Campaign ${status}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function start(id: string) {
    try {
      await api(`/campaigns/${id}/start`, { method: "POST" });
      toast.success("Campaign started · due steps processed");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Start failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-slate-500">Sequence + targeting for each service line.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">New campaign</Link>
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Replied</th>
              <th className="px-4 py-3 font-medium">Booked</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((campaign) => (
              <tr key={campaign.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{campaign.name}</td>
                <td className="px-4 py-3 tabular-nums">{campaign.leads}</td>
                <td className="px-4 py-3">
                  <Badge className="bg-slate-100 text-slate-700 capitalize dark:bg-slate-800 dark:text-slate-200">
                    {campaign.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular-nums">{campaign.replied}</td>
                <td className="px-4 py-3 tabular-nums">{campaign.booked}</td>
                <td className="px-4 py-3 text-right">
                  {campaign.status === "active" ? (
                    <Button size="sm" variant="secondary" onClick={() => void toggle(campaign.id, "paused")}>
                      Pause
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void start(campaign.id)}>
                      Start
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {(data ?? []).map((campaign) => (
          <Card key={campaign.id}>
            <CardContent className="space-y-2 p-4">
              <div className="font-medium">{campaign.name}</div>
              <div className="text-sm text-slate-500">
                {campaign.leads} leads · {campaign.replied} replied · {campaign.booked} booked
              </div>
              <Button size="sm" onClick={() => void start(campaign.id)}>
                Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
