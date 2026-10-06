/** A shimmering placeholder shaped like a chart, filling its own footprint
 * while data loads -- ported from the DOMS reference app's ChartSkeleton.
 * `variant="donut"` matches RadialGauge's round footprint; `"bars"` (the
 * default) matches the column/area charts. */
export function ChartSkeleton({ height = 220, variant = "bars" }: { height?: number; variant?: "bars" | "donut" }) {
  if (variant === "donut") {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="size-[100px] shrink-0 animate-pulse rounded-full border-[14px] border-surface-alt" />
      </div>
    );
  }
  const barHeights = [55, 85, 40, 100, 65, 78, 48];
  return (
    <div className="flex w-full animate-pulse flex-col gap-2.5" style={{ height }}>
      <div className="flex h-full items-end gap-2">
        {barHeights.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-surface-alt" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="h-1.5 w-1/3 rounded-full bg-surface-alt" />
    </div>
  );
}
