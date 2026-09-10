"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChannelMark, ServiceLabel, StatusBadge } from "@/components/leads/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { LEAD_STATUSES, type Lead } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/status";
import { Search, Filter, SortDesc, Calendar, Star } from "lucide-react";

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [service, setService] = useState("");
  const [sortParam, setSortParam] = useState("date"); // date or score

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusTab !== "all") params.set("status", statusTab);
    if (service) params.set("service", service);
    const qs = params.toString();
    return `/leads${qs ? `?${qs}` : ""}`;
  }, [q, statusTab, service]);

  const { data, error, loading } = useApi<Lead[]>(query);
  const { data: settings } = useApi<any>("/settings");

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      if (sortParam === "score") return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data, sortParam]);

  const tabs = [
    { id: "all", label: "All Leads" },
    { id: "new", label: "New Leads" },
    { id: "queued", label: "In Campaign" },
    { id: "contacted", label: "Contacted" },
    { id: "lost", label: "Lost/Discarded" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Leads CRM</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, filter, and track your high-quality leads.</p>
        </div>
        <Button asChild className="shadow-sm">
          <Link href="/dashboard/leads/import">Import CSV</Link>
        </Button>
      </div>

      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusTab === tab.id
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4 items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, company, email..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <NativeSelect 
            value={service} 
            onChange={(e) => setService(e.target.value)} 
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          >
            <option value="">All Services</option>
            {settings?.agencyProfile?.services?.map((item: string) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </NativeSelect>
        </div>

        <div className="relative">
          <SortDesc className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <NativeSelect 
            value={sortParam} 
            onChange={(e) => setSortParam(e.target.value)} 
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          >
            <option value="date">Date (Newest First)</option>
            <option value="score">Score (High to Low)</option>
          </NativeSelect>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {loading && (
        <div className="flex justify-center items-center py-10">
           <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
           <span className="ml-3 text-slate-500">Loading your leads...</span>
        </div>
      )}

      {!loading && !error && sortedData.length === 0 && (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
           <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No leads found</h3>
           <p className="mt-1 text-slate-500">Try adjusting your filters or run the Lead Finder to scrape more.</p>
           <Button asChild className="mt-4">
             <Link href="/dashboard/finder">Go to Lead Finder</Link>
           </Button>
        </div>
      )}

      {sortedData.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4 font-semibold">Name & Company</th>
                  <th className="px-5 py-4 font-semibold">Service</th>
                  <th className="px-5 py-4 font-semibold">Contact Details</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold text-center">Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <Link href={`/dashboard/leads/${lead.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                          {lead.name}
                        </Link>
                        <span className="text-slate-500 text-xs mt-0.5">{lead.company}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ServiceLabel service={lead.service} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        {lead.email && <span className="flex items-center gap-1">✉️ {lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1">📞 {lead.phone}</span>}
                        {lead.sourceUrl && (
                           <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                             🌐 Website
                           </a>
                        )}
                        {!lead.email && !lead.phone && !lead.sourceUrl && <span className="text-slate-400 italic">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={lead.status} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full font-mono text-xs font-semibold">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {lead.score}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {sortedData.map((lead) => (
              <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                <Card className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                        <div className="text-sm text-slate-500">{lead.company}</div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-mono text-xs font-semibold">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {lead.score}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <ServiceLabel service={lead.service} />
                      <StatusBadge status={lead.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
