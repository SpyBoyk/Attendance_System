import { HighchartsReact } from "highcharts-react-official";

import Highcharts, { CHART_VARS, REPORT_TOOLTIP, ensureHighchartsTheme, verticalGradient, verticalGradientHover } from "@/lib/highchartsTheme";

ensureHighchartsTheme();

/** A gradient-filled column chart with the value printed above each bar --
 * ported from the DOMS reference app's StatusColumnChart, generalized to
 * take a single base color (every bar shares it) since this app's
 * category charts are a single percentage series, not a per-category
 * palette. */
export function StatusColumnChart({
  data,
  seriesName = "Rate",
  color = CHART_VARS.brand,
  valueSuffix = "%",
  height = 220,
}: {
  data: { label: string; value: number }[];
  seriesName?: string;
  color?: string;
  valueSuffix?: string;
  height?: number;
}) {
  const options: Highcharts.Options = {
    chart: { type: "column", height, marginTop: 28 },
    xAxis: {
      categories: data.map((d) => d.label),
      labels: {
        style: { fontSize: "11px", color: CHART_VARS.inkSoft },
        rotation: data.length > 4 ? -20 : 0,
      },
      lineColor: CHART_VARS.hairline,
    },
    yAxis: { title: { text: undefined }, allowDecimals: false, gridLineColor: CHART_VARS.hairline, visible: false },
    tooltip: { ...REPORT_TOOLTIP, pointFormat: `${seriesName}: <b>{point.y}${valueSuffix}</b>` },
    plotOptions: {
      column: {
        borderRadius: 0,
        borderWidth: 0,
        color: verticalGradient(color),
        states: { hover: { color: verticalGradientHover(color) } },
        dataLabels: {
          enabled: true,
          format: `{point.y:.0f}${valueSuffix}`,
          crop: false,
          overflow: "allow",
          style: { fontSize: "10px", fontWeight: "700", color: CHART_VARS.inkSoft, textOutline: "none" },
        },
      },
    },
    series: [
      {
        type: "column",
        name: seriesName,
        data: data.map((d) => d.value),
      },
    ],
  };
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
