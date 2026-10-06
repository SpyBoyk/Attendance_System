import { HighchartsReact } from "highcharts-react-official";

import Highcharts, { CHART_VARS, REPORT_TOOLTIP, areaFadeGradient, ensureHighchartsTheme } from "@/lib/highchartsTheme";

ensureHighchartsTheme();

/** A smooth area/trend chart -- "is this rising, flat, or falling over
 * time". Ported from the DOMS reference app's TrendAreaChart. */
export function TrendAreaChart({
  data,
  seriesName = "Rate",
  color = CHART_VARS.brand,
  valueSuffix = "",
  yMin,
  yMax,
  height = 220,
}: {
  data: { label: string; value: number }[];
  seriesName?: string;
  color?: string;
  /** Appended after the tooltip's value, e.g. "%" for a rate series. */
  valueSuffix?: string;
  /** Force the y-axis range instead of auto-scaling -- a percentage
   * series (0-100) should hold that full range so small real swings
   * don't look exaggerated by a narrow auto-zoomed axis. */
  yMin?: number;
  yMax?: number;
  height?: number;
}) {
  const options: Highcharts.Options = {
    chart: { type: "area", height },
    xAxis: {
      categories: data.map((d) => d.label),
      labels: { style: { fontSize: "11px", color: CHART_VARS.inkSoft } },
      lineColor: CHART_VARS.hairline,
    },
    yAxis: {
      title: { text: undefined },
      allowDecimals: false,
      min: yMin,
      max: yMax,
      gridLineColor: CHART_VARS.hairline,
      gridLineDashStyle: "Dash",
      labels: { style: { fontSize: "11px", color: CHART_VARS.inkFaint } },
    },
    tooltip: { ...REPORT_TOOLTIP, pointFormat: `${seriesName}: <b>{point.y}${valueSuffix}</b>` },
    plotOptions: {
      area: {
        marker: { radius: 3, states: { hover: { radius: 5, lineWidth: 2 } } },
        lineWidth: 2,
        fillColor: areaFadeGradient(color),
        states: { hover: { lineWidthPlus: 1 } },
      },
    },
    series: [{ type: "area", name: seriesName, data: data.map((d) => d.value), color }],
  };
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
