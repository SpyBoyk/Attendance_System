import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const ACCENT_COLOR: Record<string, string> = {
  brand: "rgb(var(--brand-600))",
  emerald: "rgb(var(--good))",
  amber: "rgb(var(--warn))",
  rose: "rgb(var(--crit))",
  sky: "rgb(var(--brand-400))",
};

/** A donut chart with the value centered inside the ring -- the Highcharts
 * "DonutWithTotal" pattern (chart + a separate absolutely-positioned overlay
 * div for the big number), reimplemented in Recharts: the center number is
 * never a chart data label, just HTML stacked on top via position:absolute. */
export function DonutWithTotal({
  value,
  label,
  accent = "brand",
  size = 120,
}: {
  value: number;
  label: string;
  accent?: keyof typeof ACCENT_COLOR;
  size?: number;
}) {
  const color = ACCENT_COLOR[accent] ?? ACCENT_COLOR.brand;
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ v: clamped }, { v: 100 - clamped }];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="v"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="rgb(var(--hairline))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-ink">{Math.round(value)}%</span>
        <span className="text-[10px] font-medium text-ink-faint">{label}</span>
      </div>
    </div>
  );
}
