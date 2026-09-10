"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { Lead, ServiceTarget } from "@/lib/types";
import { StatusBadge } from "@/components/leads/status-badge";

const STEPS = [
  { index: 0, dayOffset: 0, channel: "email", label: "Initial" },
  { index: 1, dayOffset: 3, channel: "email", label: "Follow-up 1" },
  { index: 2, dayOffset: 7, channel: "whatsapp", label: "Follow-up 2" },
  { index: 3, dayOffset: 14, channel: "email", label: "Final" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: settings } = useApi<any>("/settings");
  const { data: leads } = useApi<Lead[]>("/leads");
  const [name, setName] = useState("Web Dev Outreach");
  const [service, setService] = useState<ServiceTarget>("web_dev");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings?.agencyProfile?.services && settings.agencyProfile.services.length > 0 && !service) {
      setService(settings.agencyProfile.services[0]);
    }
  }, [settings, service]);

  const eligible = useMemo(
    () => (leads ?? []).filter((l) => !l.campaignId && l.status !== "lost" && l.status !== "discarded" && (!service || l.service === service)),
    [leads, service],
  );

  function toggle(id: string) {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  async function save(start: boolean) {
    const leadIds = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (!name.trim()) return toast.error("Name is required");
    if (!leadIds.length) return toast.error("Select at least one lead");
    setBusy(true);
    try {
      const campaign = await api<{ id: string }>("/campaigns", {
        method: "POST",
        body: { name, serviceTarget: service, leadIds, sequence: STEPS },
      });
      if (start) await api(`/campaigns/${campaign.id}/start`, { method: "POST" });
      toast.success(start ? "Campaign saved and started" : "Campaign saved");
      router.push("/dashboard/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New campaign</h1>
        <p className="text-sm text-slate-500">Pick a service, leads, and the default 0/3/7/14 sequence.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service">Target service</Label>
            <NativeSelect id="service" className="w-full" value={service} onChange={(e) => setService(e.target.value as ServiceTarget)}>
              {settings?.agencyProfile?.services?.map((item: string) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {eligible.map((lead) => (
            <label key={lead.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
              <input type="checkbox" name="leadIds" value={lead.id} checked={Boolean(selected[lead.id])} onChange={() => toggle(lead.id)} />
              <span className="flex-1">
                {lead.name} — {lead.company}
              </span>
              <StatusBadge status={lead.status} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sequence steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {STEPS.map((step) => (
            <div key={step.index} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
              Day {step.dayOffset} · {step.channel === "email" ? "Email" : "WhatsApp"} · {step.label}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button disabled={busy} onClick={() => void save(true)}>
        Save & start campaign
      </Button>
    </div>
  );
}
