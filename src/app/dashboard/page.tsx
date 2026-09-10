"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type { Activity, DashboardStats, HealthCheck } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Activity as ActivityIcon, Mail, Phone, Calendar as CalendarIcon, Cpu, RefreshCw } from "lucide-react";

function useAnimatedNumber(value: number, duration = 1000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startValue = current;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.floor(startValue + (endValue - startValue) * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrent(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return current;
}

function Stat({ label, value }: { label: string; value: number }) {
  const animatedValue = useAnimatedNumber(value);
  return (
    <Card className="overflow-hidden relative transition-all hover:shadow-md border-slate-200/60 dark:border-slate-800/60">
      <CardContent className="p-5">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
          {animatedValue}
        </div>
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-0 transition-opacity hover:opacity-100" />
    </Card>
  );
}

function Dot({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: any }) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{ok ? "Active" : "Issue"}</span>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const stats = useApi<DashboardStats>("/dashboard/stats", 5000);
  const activity = useApi<Activity[]>("/activity", 5000);
  const health = useApi<HealthCheck>("/health", 10000);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 font-medium">Funnel health and live system status</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          <RefreshCw className={`h-3 w-3 ${activity.loading ? 'animate-spin text-indigo-500' : ''}`} />
          {activity.loading ? 'Syncing...' : 'Live view'}
        </div>
      </div>

      {stats.error && <p className="text-sm text-red-600">{stats.error}. Is the API running on port 4000?</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Leads sourced" value={stats.data?.sourced ?? 0} />
        <Stat label="Contacted" value={stats.data?.contacted ?? 0} />
        <Stat label="Replied" value={stats.data?.replied ?? 0} />
        <Stat label="Meetings booked" value={stats.data?.booked ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.data?.funnel ?? []}>
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4338CA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              Recent activity
              <span className="text-xs font-normal text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">Last 50 events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[280px] overflow-y-auto">
              {(activity.data ?? []).slice(0, 50).map((item) => (
                <li key={item.id} className="p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      {formatDate(item.createdAt, true)}
                    </div>
                  </div>
                </li>
              ))}
              {!activity.data?.length && <li className="p-8 text-center text-sm text-slate-500">No activity yet.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            <Dot icon={Mail} ok={Boolean(health.data?.checks.gmail.ok)} label={health.data?.checks.gmail.ok ? "Gmail Connected" : "Gmail Disconnected"} />
            <Dot icon={Phone} ok={Boolean(health.data?.checks.whatsapp.ok)} label={health.data?.checks.whatsapp.ok ? "WhatsApp Connected" : "WhatsApp Disconnected"} />
            <Dot icon={Cpu} ok={Boolean(health.data?.checks.ai.ok)} label="AI Router Healthy" />
            <Dot icon={CalendarIcon} ok={Boolean(health.data?.checks.calendar.ok)} label={health.data?.checks.calendar.ok ? "Calendar Connected" : "Calendar Disconnected"} />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
