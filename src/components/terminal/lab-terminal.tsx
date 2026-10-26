"use client";

import { useEffect, useRef } from "react";
import type { GradeContext } from "@/lib/lessons/grader";
import type { LabSeed, LabShell } from "@/lib/shell/shell";

const theme = {
  background: "#000c00",
  foreground: "#39ff6a",
  cursor: "#d8ffd8",
  cursorAccent: "#001400",
  selectionBackground: "#0c4d22",
  selectionForeground: "#e9ffe9",
  black: "#001400",
  red: "#ff6b6b",
  green: "#00ff41",
  yellow: "#c6ff55",
  blue: "#5dffb0",
  magenta: "#8dffc0",
  cyan: "#7dffa8",
  white: "#c8ffd4",
  brightBlack: "#1c6b32",
  brightRed: "#ff9b9b",
  brightGreen: "#7dff9a",
  brightYellow: "#d8ff8a",
  brightBlue: "#b4ffd6",
  brightMagenta: "#d2ffe4",
  brightCyan: "#e4fff0",
  brightWhite: "#f4fff6",
};

function matrixFontFamily() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-matrix").trim();
  const family = raw.replace(/^["']|["']$/g, "");
  return family ? `${family}, ui-monospace, monospace` : '"Share Tech Mono", ui-monospace, monospace';
}

function terminalFontSize() {
  if (window.matchMedia("(max-width: 480px)").matches) return 14;
  if (window.matchMedia("(max-width: 1023px)").matches) return 16;
  return 15;
}

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
  const termRef = useRef<{ focus: () => void } | null>(null);
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
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]);
      if (cancelled || !hostRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: matrixFontFamily(),
        fontSize: terminalFontSize(),
        lineHeight: 1.25,
        theme,
        scrollback: 2000,
      });
      const fit = new FitAddon();
      fitRef.current = fit;
      term.loadAddon(fit);
      termRef.current = term;
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
        if (host.clientWidth === 0) return;
        const size = terminalFontSize();
        if (term.options.fontSize !== size) term.options.fontSize = size;
        fit.fit();
      });
      observer.observe(host);
      if (window.matchMedia("(min-width: 1024px)").matches) term.focus();

      cleanup = () => {
        observer.disconnect();
        subscription.dispose();
        term.dispose();
        if (shellRef) shellRef.current = null;
        fitRef.current = null;
        termRef.current = null;
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
      className="lab-terminal h-full min-h-0"
      role="region"
      aria-label="Lab terminal"
      onPointerDown={() => termRef.current?.focus()}
    />
  );
}
