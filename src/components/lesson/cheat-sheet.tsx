export function CheatSheet({
  items,
}: {
  items: { command: string; description: string }[];
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-ink-2/40">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Cheat sheet</p>
        <p className="mt-1 text-sm text-muted">For this lesson only.</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {items.map((item) => (
          <li key={item.command}>
            <code className="font-mono text-sm text-paper">{item.command}</code>
            <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
