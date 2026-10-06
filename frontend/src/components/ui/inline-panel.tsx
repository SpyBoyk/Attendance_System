import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A full-width panel that expands under a card's header, spanning the same
 * width as the table below it -- used for "Add X" forms instead of a small
 * floating popover. */
export function AddToggleButton({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <Button size="sm" variant={open ? "outline" : "primary"} onClick={onToggle}>
      {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
      {open ? "Close" : label}
    </Button>
  );
}

export function InlineAddPanel({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null;
  return <div className="border-b border-hairline bg-surface-alt/40 p-4 sm:p-5">{children}</div>;
}
