import HighchartsReact from "highcharts-react-official";

import Highcharts, { CHART_VARS, ensureHighchartsTheme, resolveCssColor } from "@/lib/highchartsTheme";

ensureHighchartsTheme();

/** A single-metric solid-gauge -- "X% of Y", drawn as a ring filled to
 * that percentage. Ported from the DOMS reference app's RadialGauge: this
 * app's attendance-rate / staff-attendance-rate KPIs are each a single
 * rate, not a multi-category breakdown, so this (not DonutWithTotal, which
 * needs several named slices) is the faithful match for "at a glance". */
export function RadialGauge({
  percent,
  label,
  color = CHART_VARS.brand,
  size = 150,
}: {
  /** 0-100. */
  percent: number;
  label: string;
  color?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const resolvedColor = resolveCssColor(color);
  const options: Highcharts.Options = {
    chart: { type: "solidgauge", height: size, width: size },
    pane: {
      center: ["50%", "50%"],
      size: "100%",
      startAngle: 0,
      endAngle: 360,
      background: [
        {
          outerRadius: "100%",
          innerRadius: "72%",
          backgroundColor: CHART_VARS.surfaceAlt,
          borderWidth: 0,
        },
      ],
    },
    yAxis: { min: 0, max: 100, lineWidth: 0, tickPositions: [] },
    tooltip: { enabled: false },
    series: [
      {
        type: "solidgauge",
        data: [{ y: clamped, color: resolvedColor, radius: "100%", innerRadius: "72%" }],
        dataLabels: { enabled: false },
      },
    ],
  };
  return (
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold tracking-tight text-ink">{Math.round(clamped)}%</span>
        <span className="max-w-[80px] text-center text-[9px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      </div>
    </div>
  );
}
