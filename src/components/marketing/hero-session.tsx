export function HeroSession() {
  const lines = [
    { kind: "prompt", text: "pwd" },
    { kind: "out", text: "/home/student" },
    { kind: "prompt", text: "cd labs/week1" },
    { kind: "prompt", text: "ls -l" },
    { kind: "out", text: "-rw-r--r-- 1 student student 128 Oct 26 09:00 brief.txt" },
    { kind: "mark", text: "marked — Move into labs/week1" },
  ] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#14120f] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-xs text-muted">student@aterx</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">Lesson 1</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-paper">
        {lines.map((line, index) => (
          <div key={index} className={line.kind === "mark" ? "text-mint" : line.kind === "out" ? "text-muted" : ""}>
            {line.kind === "prompt" ? <span className="text-mint">student@aterx:~$ </span> : null}
            {line.kind === "mark" ? "· " : ""}
            {line.text}
            {index === lines.length - 1 ? <span className="blink text-amber"> ▋</span> : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
