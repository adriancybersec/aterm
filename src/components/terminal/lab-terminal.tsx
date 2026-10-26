"use client";

import { useEffect, useRef } from "react";
import type { GradeContext } from "@/lib/lessons/grader";
import type { LabSeed, LabShell } from "@/lib/shell/shell";

const theme = {
  background: "#14120f",
  foreground: "#f3eee6",
  cursor: "#f0a202",
  cursorAccent: "#14120f",
  selectionBackground: "#3a342c",
  black: "#1a1714",
  red: "#ff8d7a",
  green: "#c6e09a",
  yellow: "#f0a202",
  blue: "#8eb6e0",
  magenta: "#d7a4e0",
  cyan: "#8fd0c4",
  white: "#f3eee6",
  brightBlack: "#8c8276",
  brightWhite: "#fffaf3",
};

export function LabTerminal({
  seed,
  seedKey,
  visible = true,
  onCommand,
  shellRef,
}: {
  seed: LabSeed;
  seedKey: string;
  visible?: boolean;
  onCommand?: (event: GradeContext) => void;
  shellRef?: { current: LabShell | null };
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCommandRef = useRef(onCommand);
  const fitRef = useRef<{ fit: () => void } | null>(null);
  const seedRef = useRef(seed);

  useEffect(() => {
    onCommandRef.current = onCommand;
    seedRef.current = seed;
  }, [onCommand, seed]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    void (async () => {
      const [{ Terminal }, { FitAddon }, shellMod] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@/lib/shell/shell"),
      ]);
      await import("@xterm/xterm/css/xterm.css");
      if (cancelled || !hostRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontSize: 14,
        lineHeight: 1.35,
        theme,
        scrollback: 2000,
      });
      const fit = new FitAddon();
      fitRef.current = fit;
      term.loadAddon(fit);
      term.open(host);
      fit.fit();

      const shell = new shellMod.LabShell({
        write: (data) => term.write(data),
        seed: seedRef.current,
        onCommand: (event) => onCommandRef.current?.(event),
      });
      if (shellRef) shellRef.current = shell;
      shell.start();
      const subscription = term.onData((data) => shell.input(data));
      const observer = new ResizeObserver(() => {
        if (host.clientWidth > 0) fit.fit();
      });
      observer.observe(host);
      if (window.matchMedia("(min-width: 1024px)").matches) term.focus();

      cleanup = () => {
        observer.disconnect();
        subscription.dispose();
        term.dispose();
        if (shellRef) shellRef.current = null;
        fitRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [seedKey, shellRef]);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => fitRef.current?.fit());
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  return (
    <div
      ref={hostRef}
      className="lab-terminal h-full min-h-[420px] bg-[#14120f]"
      role="region"
      aria-label="Lab terminal"
    />
  );
}
