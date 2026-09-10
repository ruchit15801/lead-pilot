"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import type { Activity, DashboardStats, HealthCheck } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Activity as ActivityIcon, Mail, Phone, Calendar as CalendarIcon, Cpu, RefreshCw, TrendingUp } from "lucide-react";

function useAnimatedNumber(value: number, duration = 1500) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startValue = current;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); // Quartic ease out
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

function Stat({ label, value, trend }: { label: string; value: number; trend?: string }) {
  const animatedValue = useAnimatedNumber(value);
  return (
    <Card className="relative overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
          {trend && (
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        <div className="mt-4 text-4xl font-heading font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
          {animatedValue}
        </div>
      </CardContent>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}

function Dot({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: any }) {
  return (
    <li className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 transition-colors">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm ${ok ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"}`} />
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{ok ? "Active" : "Issue"}</span>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const stats = useApi<DashboardStats>("/dashboard/stats", 5000);
  const activity = useApi<Activity[]>("/activity", 5000);
  const health = useApi<HealthCheck>("/health", 10000);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time metrics and system health for your workspace</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500">
          <RefreshCw className={`h-3.5 w-3.5 ${activity.loading ? 'animate-spin text-indigo-500' : ''}`} />
          {activity.loading ? 'Syncing data...' : 'Live tracking active'}
        </div>
      </div>

      {stats.error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          {stats.error}. Is the API running on port 4000?
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Stat label="Total Leads" value={stats.data?.sourced ?? 0} trend="+12%" />
        <Stat label="In Sequence" value={stats.data?.contacted ?? 0} trend="+5%" />
        <Stat label="Client Replies" value={stats.data?.replied ?? 0} trend="+18%" />
        <Stat label="Meetings Booked" value={stats.data?.booked ?? 0} trend="+24%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.data?.funnel ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Live Feed</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 h-[300px] overflow-y-auto">
              {(activity.data ?? []).slice(0, 50).map((item) => (
                <li key={item.id} className="p-4 transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/80 group">
                  <div className="flex gap-4">
                    <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover:scale-150 transition-transform" />
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.text}</span>
                      <div className="text-[11px] font-semibold text-slate-400">
                        {formatDate(item.createdAt, true)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!activity.data?.length && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ActivityIcon className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No activity recorded yet.</p>
                </div>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Dot icon={Mail} ok={Boolean(health.data?.checks.gmail.ok)} label={health.data?.checks.gmail.ok ? "Gmail Connected" : "Gmail Offline"} />
            <Dot icon={Phone} ok={Boolean(health.data?.checks.whatsapp.ok)} label={health.data?.checks.whatsapp.ok ? "WhatsApp Connected" : "WhatsApp Offline"} />
            <Dot icon={Cpu} ok={Boolean(health.data?.checks.ai.ok)} label="AI Core Online" />
            <Dot icon={CalendarIcon} ok={Boolean(health.data?.checks.calendar.ok)} label={health.data?.checks.calendar.ok ? "Calendar Active" : "Calendar Offline"} />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
