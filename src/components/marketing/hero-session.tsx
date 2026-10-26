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
    <div className="lab-terminal overflow-hidden rounded-2xl border border-[#145c28] shadow-[0_24px_80px_rgba(0,40,10,0.45)]">
      <div className="relative z-[1] flex items-center justify-between border-b border-[#145c28] px-4 py-3">
        <span className="font-matrix text-xs text-[#7dff9a]">student@aterx</span>
        <span className="font-matrix text-[10px] uppercase tracking-[0.18em] text-[#c6ff55]">Lesson 1</span>
      </div>
      <pre className="relative z-[1] overflow-x-auto p-4 font-matrix text-[15px] leading-7 text-[#39ff6a] sm:p-5 sm:text-base">
        {lines.map((line, index) => (
          <div key={index} className={line.kind === "out" ? "text-[#7dff9a]" : ""}>
            {line.kind === "prompt" ? <span className="text-[#d8ffd8]">student@aterx:~$ </span> : null}
            {line.kind === "mark" ? "· " : ""}
            {line.text}
            {index === lines.length - 1 ? <span className="blink text-[#d8ffd8]"> ▋</span> : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
