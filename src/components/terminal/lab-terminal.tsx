"use client";

import { useEffect, useRef } from "react";
import type { GradeContext } from "@/lib/lessons/grader";
import type { LabSeed, LabShell } from "@/lib/shell/shell";

const theme = {
  background: "#0b110f",
  foreground: "#d5f5e0",
  cursor: "#3ddc84",
  cursorAccent: "#062014",
  selectionBackground: "#1c4d32",
  selectionForeground: "#e7eee9",
  black: "#0b110f",
  red: "#ff8b7a",
  green: "#3ddc84",
  yellow: "#d6e38a",
  blue: "#8fd0c4",
  magenta: "#c7b0e8",
  cyan: "#8ee0c8",
  white: "#e7eee9",
  brightBlack: "#5d7366",
  brightRed: "#ffb0a4",
  brightGreen: "#8ef0b4",
  brightYellow: "#e7f0b0",
  brightBlue: "#b7e6dc",
  brightMagenta: "#ddcdee",
  brightCyan: "#c6f3e4",
  brightWhite: "#f4fff8",
};

function terminalFontFamily() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim();
  return raw || '"JetBrains Mono", ui-monospace, monospace';
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
        fontFamily: terminalFontFamily(),
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
