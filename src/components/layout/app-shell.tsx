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
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="lg:grid lg:grid-cols-[240px_1fr]">
        <aside
          className={cn(
            "fixed inset-0 z-40 bg-white/95 backdrop-blur-sm dark:bg-slate-950/95 lg:static lg:block lg:h-screen lg:border-r lg:border-slate-200 lg:dark:border-slate-800",
            open ? "block" : "hidden lg:block",
          )}
        >
          <div className="flex h-full flex-col px-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <AxoryteWordmark />
              <button className="lg:hidden min-h-10 min-w-10" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-700 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800">
              Internal ops · Ruchit
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-8">
            <button className="lg:hidden min-h-10 min-w-10" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden text-sm text-slate-500 lg:block">Axoryte Infosoft · outreach control</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline text-slate-500">Admin</span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-700 text-xs font-semibold text-white">
                R
              </span>
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden" aria-label="Mobile">
        {NAV.slice(0, 6).map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                active ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
