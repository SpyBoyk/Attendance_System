import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type SortDir = "asc" | "desc";

export function SortableHeader<F extends string>({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: F;
  sortField: F | null;
  sortDir: SortDir;
  onSort: (field: F) => void;
}) {
  const active = sortField === field;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase hover:text-brand-800",
        active ? "text-brand-800" : "text-brand-700",
      )}
    >
      {label}
      <Icon className="size-3" />
    </button>
  );
}
