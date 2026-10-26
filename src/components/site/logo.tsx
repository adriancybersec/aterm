import { cn } from "@/lib/utils";

export function Logo({ className, wordmark = true }: { className?: string; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-paper", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#0c1210" />
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="6.25" stroke="#3DDC84" strokeWidth="1.5" />
        <path d="M8.5 22.5 16 9.5l7.5 13" stroke="#3DDC84" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 17.5h8" stroke="#E7EEE9" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {wordmark ? <span className="text-[15px] font-medium tracking-tight">Aterx</span> : null}
    </span>
  );
}
