import type { Lead, ServiceTarget } from "../../lib/types";
import { loadDb, mutate, newId, nowIso } from "../store/fileStore";
import { applyLeadDerived } from "./leadService";
import { discoverLeads, type ScrapedLead } from "./scraperService";

// ─── Automation Rules ───────────────────────────────────────────

/**
 * Auto-enrollment: when a new lead is created with score >= 70,
 * find an active campaign matching its service and enqueue it.
 */
export async function autoEnrollLead(lead: Lead) {
  if (lead.score < 70) return null;
  if (lead.status === "discarded" || lead.status === "lost") return null;
  if (lead.campaignId) return null; // already in a campaign
  if (!lead.primaryChannel) return null; // no contact channel

  const db = await loadDb();
  const matchingCampaign = db.campaigns.find(
    (campaign) =>
      campaign.status === "active" &&
      (!lead.service || campaign.serviceTarget === lead.service),
  );

  if (!matchingCampaign) return null;

  await mutate((store) => {
    const current = store.leads.find((item) => item.id === lead.id);
    if (!current || current.campaignId) return;
    current.campaignId = matchingCampaign.id;
    current.status = "queued";
    current.sequenceStep = 0;
    current.nextFollowUpAt = new Date().toISOString();
    current.updatedAt = nowIso();

    if (!matchingCampaign.leadIds.includes(lead.id)) {
      matchingCampaign.leadIds.push(lead.id);
      matchingCampaign.updatedAt = nowIso();
    }

    store.activities.unshift({
      id: newId(),
      type: "automation",
      text: `Auto-enrolled ${current.name} in campaign "${matchingCampaign.name}"`,
      leadId: current.id,
      createdAt: nowIso(),
    });
  });

  return { campaignId: matchingCampaign.id, campaignName: matchingCampaign.name };
}

/**
 * Run the full discovery pipeline:
 * 1. Scrape leads from the web
 * 2. Deduplicate against existing leads
 * 3. Score and create new leads
 * 4. Auto-enroll high-scoring leads in active campaigns
 */
export async function runDiscoveryPipeline(options?: {
  maxResults?: number;
}) {
  const maxResults =
    options?.maxResults ??
    Number(process.env.SCRAPER_MAX_RESULTS ?? 20);

  const db = await loadDb();
  const profile = db.settings.agencyProfile;
  
  if (!profile || !profile.searchQueries || profile.searchQueries.length === 0) {
    throw new Error("Agency profile is not configured. Please configure your agency website in Settings first.");
  }

  const excludeDomains = db.leads
    .map(l => {
      if (!l.sourceUrl) return "";
      try {
        return new URL(l.sourceUrl).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  const scraped = await discoverLeads(profile.searchQueries, { 
    maxResults,
    excludeDomains 
  });

  let imported = 0;
  let skipped = 0;
  let enrolled = 0;
  const newLeads: Lead[] = [];

  for (const raw of scraped) {
    // Deduplicate by email or company name
    const isDuplicate = db.leads.some(
      (existing) =>
        (raw.email &&
          existing.email?.toLowerCase() === raw.email.toLowerCase()) ||
        (existing.company.toLowerCase() === raw.company.toLowerCase() &&
          existing.name.toLowerCase() === raw.name.toLowerCase()),
    );

    if (isDuplicate) {
      skipped += 1;
      continue;
    }

    const service = raw.service;

    const derived = applyLeadDerived({
      name: raw.name,
      company: raw.company,
      role: raw.role,
      email: raw.email,
      phone: raw.phone,
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      service,
      scrapedAt: raw.scrapedAt,
    });

    const lead: Lead = {
      id: newId(),
      createdAt: nowIso(),
      ...derived,
    };

    await mutate((store) => {
      store.leads.unshift(lead);
      store.activities.unshift({
        id: newId(),
        type: "scrape",
        text: `Scraped lead: ${lead.name} — ${lead.company} (score: ${lead.score})`,
        leadId: lead.id,
        createdAt: nowIso(),
      });
    });

    // Reload db state after mutate
    const freshDb = await loadDb();
    const freshLead = freshDb.leads.find((item) => item.id === lead.id);
    if (freshLead) {
      const enrollment = await autoEnrollLead(freshLead);
      if (enrollment) enrolled += 1;
    }

    newLeads.push(lead);
    imported += 1;
  }

  if (imported > 0) {
    await mutate((store) => {
      store.activities.unshift({
        id: newId(),
        type: "scrape",
        text: `Discovery pipeline: ${imported} new leads, ${skipped} duplicates, ${enrolled} auto-enrolled`,
        createdAt: nowIso(),
      });
    });
  }

  return { scraped: scraped.length, imported, skipped, enrolled, leads: newLeads };
}


