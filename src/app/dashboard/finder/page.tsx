"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { StatusBadge, ServiceLabel } from "@/components/leads/status-badge";
import type { Lead } from "@/lib/types";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/use-api";

type DiscoveryResult = {
  scraped: number;
  imported: number;
  skipped: number;
  enrolled: number;
  leads: Lead[];
};

export default function FinderPage() {
  const { data: settings } = useApi<any>("/settings");
  const [busy, setBusy] = useState(false);
  const [maxResults, setMaxResults] = useState(10);
  const [result, setResult] = useState<DiscoveryResult | null>(null);



  async function runScraper() {
    setBusy(true);
    try {
      const data = await api<DiscoveryResult>("/scraper/run", {
        method: "POST",
        body: { maxResults },
      });
      setResult(data);
      toast.success(
        `Found ${data.scraped} results → ${data.imported} new leads, ${data.enrolled} auto-enrolled`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scraper failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lead Finder</h1>
        <p className="text-sm text-slate-500">
          Discover new leads by scraping the web for companies matching Axoryte&apos;s services.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discovery settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium">Target services (Configured via Agency Settings)</div>
            {settings?.agencyProfile ? (
              <div className="flex flex-wrap gap-2">
                {settings.agencyProfile.services.map((service: string) => (
                  <span
                    key={service}
                    className="rounded-full px-3 py-1.5 text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  >
                    {service}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                You haven't configured your agency URL yet. The scraper requires an active agency profile to generate leads.
                <br/>
                <Link href="/dashboard/settings" className="underline font-semibold mt-1 inline-block">Go configure your agency</Link>
              </div>
            )}
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="maxResults">
                Max results
              </label>
              <NativeSelect
                id="maxResults"
                value={String(maxResults)}
                onChange={(e) => setMaxResults(Number(e.target.value))}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </NativeSelect>
            </div>
            <Button onClick={() => void runScraper()} disabled={busy || !settings?.agencyProfile}>
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Scraping…
                </span>
              ) : (
                "Run discovery"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              Results — {result.imported} new leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="mb-3 flex flex-wrap gap-4 text-sm">
              <span>
                <span className="font-mono tabular-nums">{result.scraped}</span> pages scraped
              </span>
              <span>
                <span className="font-mono tabular-nums">{result.imported}</span> imported
              </span>
              <span>
                <span className="font-mono tabular-nums">{result.skipped}</span> duplicates
              </span>
              <span className="text-emerald-700 dark:text-emerald-400">
                <span className="font-mono tabular-nums">{result.enrolled}</span> auto-enrolled
              </span>
            </div>

            {result.leads.length === 0 && (
              <p className="text-sm text-slate-500">
                No new leads found. Try different services or increase max results.
              </p>
            )}

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((lead) => (
                    <tr key={lead.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                        >
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{lead.company}</td>
                      <td className="px-4 py-3">
                        <ServiceLabel service={lead.service} />
                      </td>
                      <td className="px-4 py-3">
                        {lead.sourceUrl ? (
                          <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                            Link
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{lead.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {result.leads.map((lead) => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="font-medium">
                        {lead.name} — {lead.company}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <ServiceLabel service={lead.service} />
                        <span>·</span>
                        <StatusBadge status={lead.status} />
                        <span className="font-mono text-xs">Score {lead.score}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
