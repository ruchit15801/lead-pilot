"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Mail, Megaphone, Menu, MessageCircle, Search, Settings, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AxoryteWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/finder", label: "Lead Finder", icon: Search },
  { href: "/dashboard/leads", label: "Leads CRM", icon: Users },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#0B0F19] dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside
          className={cn(
            "fixed inset-0 z-40 bg-white/80 backdrop-blur-xl dark:bg-slate-950/80 lg:static lg:block lg:h-screen lg:border-r lg:border-slate-200/50 lg:dark:border-slate-800/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
            open ? "block" : "hidden lg:block",
          )}
        >
          <div className="flex h-full flex-col px-5 py-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <AxoryteWordmark />
              <button className="lg:hidden min-h-10 min-w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <nav className="mt-8 flex flex-1 flex-col gap-1.5" aria-label="Primary">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Overview</div>
              {NAV.map((item, i) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                // Add a visual separator before WhatsApp
                const isSeparator = item.label === "WhatsApp";
                
                return (
                  <div key={item.href}>
                    {isSeparator && <div className="mt-4 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Integrations</div>}
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group flex min-h-[44px] items-center gap-3.5 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.2)] text-white"
                          : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300",
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400")} />
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto pt-6">
              <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm dark:border-slate-800/60 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff" alt="Admin" className="h-10 w-10 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-sm" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950"></span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Axoryte Admin</span>
                    <span className="truncate text-xs text-slate-500">Workspace Owner</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col pb-20 lg:pb-0 relative">
          {/* Subtle top gradient glow */}
          <div className="absolute top-0 left-0 right-0 h-64 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/50 bg-white/60 px-4 py-4 backdrop-blur-xl dark:border-slate-800/50 dark:bg-[#0B0F19]/60 lg:px-8 transition-all">
            <div className="flex items-center gap-4">
              <button className="lg:hidden min-h-10 min-w-10 rounded-full hover:bg-slate-100 flex items-center justify-center" onClick={() => setOpen(true)} aria-label="Open menu">
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
              <h2 className="hidden text-sm font-semibold text-slate-800 dark:text-slate-200 lg:block font-heading tracking-tight">
                Welcome back, Admin 👋
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-900/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Online
              </div>
            </div>
          </header>
          
          <main id="main" className="flex-1 px-4 py-8 lg:px-8 relative z-10 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.04)]" aria-label="Mobile">
        {NAV.filter(item => ["Dashboard", "Lead Finder", "Leads CRM", "Campaigns", "Settings"].includes(item.label)).slice(0, 5).map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-1.5 text-[10px] font-medium transition-colors",
                active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300",
              )}
            >
              <div className={cn("p-1.5 rounded-full transition-all", active ? "bg-indigo-50 dark:bg-indigo-500/10" : "")}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
