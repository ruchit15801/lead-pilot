export function AxoryteMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <rect width="32" height="32" rx="10" fill="url(#brandGradient)" />
      <path
        d="M9 22.5 16 8.5l7 14H20.2L16 13.8 11.8 22.5H9Zm4.1-3.2h5.8L16 14.7l-2.9 4.6Z"
        fill="#ffffff"
      />
      <defs>
        <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AxoryteWordmark() {
  return (
    <div className="flex items-center gap-3 min-w-0 group cursor-pointer">
      <div className="relative shadow-sm shadow-indigo-500/20 rounded-xl">
        <AxoryteMark />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="font-heading font-bold text-[19px] leading-none tracking-tight text-slate-900 dark:text-white truncate">
          Axoryte
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-600 dark:text-indigo-400 mt-1 leading-none">
          Lead Pilot
        </div>
      </div>
    </div>
  );
}
