import { Inbox } from "lucide-react";

/** A calm "nothing here yet" state -- an icon plus one line, so an empty
 * chart reads as a deliberate, expected state rather than a broken one.
 * Ported from the DOMS reference app's EmptyState (swapping its icon for
 * the Inbox glyph this app's own EmptyTableRow already uses). */
export function EmptyState({ label, height }: { label: string; height?: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center" style={height ? { height } : undefined}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-ink-faint">
        <Inbox className="size-4" />
      </span>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}
