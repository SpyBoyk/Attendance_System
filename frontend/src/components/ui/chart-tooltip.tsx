export function ChartTooltip({
  active,
  payload,
  label,
  suffix = "%",
}: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-hairline bg-surface/95 px-2.5 py-2 text-[11px] shadow-lg backdrop-blur-sm"
      style={{ boxShadow: "1px 2px 6px rgba(0,0,0,0.08)" }}
    >
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {p.color && <span className="size-2 shrink-0 rounded-sm" style={{ background: p.color }} />}
            {p.name && <span className="text-ink-faint">{p.name}</span>}
            <span className="font-bold text-ink">
              {p.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
