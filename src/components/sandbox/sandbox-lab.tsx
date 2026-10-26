"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { CheatSheet } from "@/components/lesson/cheat-sheet";
import { LabTerminal } from "@/components/terminal/lab-terminal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { planAllows, planName } from "@/lib/plans";
import { useAccount } from "@/lib/progress/use-account";
import { sandboxCheatSheet, sandboxPresets } from "@/lib/sandbox/presets";

export function SandboxLab() {
  const plan = useAccount().plan;
  const [presetId, setPresetId] = useState(sandboxPresets[0].id);
  const [panel, setPanel] = useState<"terminal" | "sheet">("terminal");

  const preset = sandboxPresets.find((item) => item.id === presetId) ?? sandboxPresets[0];
  const allowed = planAllows(plan, preset.minPlan);

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[640px] flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Sandbox</p>
          <h1 className="font-serif text-3xl tracking-tight">A folder with no marking.</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{preset.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sandboxPresets.map((item) => {
            const open = planAllows(plan, item.minPlan);
            return (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === preset.id ? "default" : "outline"}
                onClick={() => setPresetId(item.id)}
              >
                {open ? null : <Lock className="h-3.5 w-3.5" aria-hidden />}
                {item.name}
              </Button>
            );
          })}
        </div>
      </div>

      {!allowed ? (
        <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4">
          <h2 className="font-serif text-3xl tracking-tight">{preset.name} is on {planName(preset.minPlan)}.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            The home preset is open on every plan. Log shelf and the permissions bench are on Plus so you can repeat those drills after the lessons.
          </p>
          <Button className="mt-6 w-fit" asChild>
            <Link href="/pricing">See plans</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="border-b border-line px-4 py-3 lg:hidden">
            <Tabs value={panel} onValueChange={(value) => setPanel(value as "terminal" | "sheet")}>
              <TabsList className="w-full">
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="sheet">Commands</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className={`${panel === "terminal" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}>
              <div className="min-h-0 flex-1">
                <LabTerminal seed={preset} seedKey={preset.id} visible={panel === "terminal"} />
              </div>
              <p className="border-t border-line px-3 py-2 font-mono text-[11px] text-faint">
                Nothing here is marked. Switching preset restores that folder.
              </p>
            </div>
            <div className={panel === "sheet" ? "min-h-0" : "hidden lg:block"}>
              <CheatSheet items={sandboxCheatSheet} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
