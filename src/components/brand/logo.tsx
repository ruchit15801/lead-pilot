export function AxoryteMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#4338CA" />
      <path
        d="M9 22.5 16 8.5l7 14H20.2L16 13.8 11.8 22.5H9Zm4.1-3.2h5.8L16 14.7l-2.9 4.6Z"
        fill="#EEF2FF"
      />
    </svg>
  );
}

export function AxoryteWordmark() {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <AxoryteMark />
      <div className="min-w-0 leading-tight">
        <div className="font-semibold text-slate-900 dark:text-white truncate">Axoryte</div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Outreach</div>
      </div>
    </div>
  );
}
