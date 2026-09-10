import type { Campaign, SequenceStep, ServiceTarget } from "../../lib/types";
import { DEFAULT_SEQUENCE, nextFollowUpAt } from "../domain/followup";
import { NotFoundError, ValidationError } from "../lib/errors";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";

export async function listCampaigns() {
  const db = await loadDb();
  return db.campaigns.map((campaign) => {
    const leads = db.leads.filter((lead) => campaign.leadIds.includes(lead.id));
    return {
      ...campaign,
      leads: leads.length,
      replied: leads.filter((lead) => lead.status === "replied" || lead.status === "meeting_booked").length,
      booked: leads.filter((lead) => lead.status === "meeting_booked").length,
    };
  });
}

export async function createCampaign(input: {
  name: string;
  serviceTarget: ServiceTarget;
  sequence?: SequenceStep[];
  leadIds: string[];
}) {
  if (!input.name?.trim()) throw new ValidationError("Campaign name is required");
  if (!input.leadIds?.length) throw new ValidationError("Select at least one lead");

  return mutate((db) => {
    const campaign: Campaign = {
      id: newId(),
      name: input.name.trim(),
      serviceTarget: input.serviceTarget,
      status: "draft",
      leadIds: input.leadIds,
      sequence: input.sequence?.length ? input.sequence : DEFAULT_SEQUENCE.map((step) => ({ ...step })),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.campaigns.unshift(campaign);
    return campaign;
  });
}

export async function startCampaign(id: string) {
  return mutate((db) => {
    const campaign = db.campaigns.find((item) => item.id === id);
    if (!campaign) throw new NotFoundError("Campaign", id);
    campaign.status = "active";
    campaign.updatedAt = nowIso();
    const first = campaign.sequence[0];
    for (const leadId of campaign.leadIds) {
      const lead = db.leads.find((item) => item.id === leadId);
      if (!lead || lead.paused) continue;
      if (lead.status === "discarded" || lead.status === "lost" || lead.status === "meeting_booked") continue;
      if (lead.status === "review" || lead.status === "needs_research") continue;
      lead.campaignId = campaign.id;
      lead.status = lead.status === "contacted" ? "contacted" : "queued";
      lead.sequenceStep = lead.sequenceStep || 0;
      lead.nextFollowUpAt = nextFollowUpAt(new Date(), first?.dayOffset ?? 0).toISOString();
      lead.updatedAt = nowIso();
    }
    db.activities.unshift({
      id: newId(),
      type: "campaign",
      text: `Campaign started: ${campaign.name}`,
      createdAt: nowIso(),
    });
    return { status: "active" as const, campaign };
  });
}

export async function patchCampaign(id: string, status: Campaign["status"]) {
  return mutate((db) => {
    const campaign = db.campaigns.find((item) => item.id === id);
    if (!campaign) throw new NotFoundError("Campaign", id);
    campaign.status = status;
    campaign.updatedAt = nowIso();
    if (status === "paused") {
      for (const leadId of campaign.leadIds) {
        const lead = db.leads.find((item) => item.id === leadId);
        if (lead && lead.status === "queued") lead.paused = true;
      }
    }
    return campaign;
  });
}
