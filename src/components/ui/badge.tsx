import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "amber" | "mint" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        tone === "neutral" && "border-line text-muted",
        tone === "amber" && "border-amber/40 bg-amber/10 text-amber",
        tone === "mint" && "border-mint/30 bg-mint/10 text-mint",
        className,
      )}
      {...props}
    />
  );
}
