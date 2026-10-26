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
    <div className="lab-terminal overflow-hidden border border-[#145c28]">
      <div className="relative z-[1] flex items-center justify-between border-b border-[#145c28] px-4 py-3">
        <span className="font-mono text-xs text-mint">student@aterx</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Lesson 1</span>
      </div>
      <pre className="relative z-[1] overflow-x-auto p-4 font-mono text-[13px] leading-6 text-paper sm:p-5 sm:text-sm sm:leading-7">
        {lines.map((line, index) => (
          <div key={index} className={line.kind === "out" ? "text-muted" : ""}>
            {line.kind === "prompt" ? <span className="text-amber">student@aterx:~$ </span> : null}
            {line.kind === "mark" ? "· " : ""}
            {line.text}
            {index === lines.length - 1 ? <span className="blink text-amber"> ▋</span> : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
