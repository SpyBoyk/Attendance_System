import { Search, X } from "lucide-react";

import { cn } from "@/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full bg-surface-alt py-1.5 pl-9 pr-9 text-sm font-normal text-ink [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] placeholder:text-ink-faint focus:bg-brand-50 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 flex size-4 -translate-y-1/2 items-center justify-center text-ink-faint hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
