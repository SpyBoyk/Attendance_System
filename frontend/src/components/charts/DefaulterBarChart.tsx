import { HighchartsReact } from "highcharts-react-official";

import Highcharts, { CHART_VARS, REPORT_TOOLTIP, ensureHighchartsTheme, horizontalGradient } from "@/lib/highchartsTheme";

ensureHighchartsTheme();

/** Horizontal bars -- reads much better than a column chart once the
 * category labels are full names instead of short codes. Used for the
 * "worst attendance" leaderboard, worst at the top. */
export function DefaulterBarChart({
  data,
  color = CHART_VARS.crit,
  height = 240,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const options: Highcharts.Options = {
    chart: { type: "bar", height },
    xAxis: {
      categories: data.map((d) => d.label),
      labels: { style: { fontSize: "11px", color: CHART_VARS.inkSoft } },
      lineColor: CHART_VARS.hairline,
    },
    yAxis: { title: { text: undefined }, max: 100, gridLineColor: CHART_VARS.hairline, gridLineDashStyle: "Dash" },
    tooltip: { ...REPORT_TOOLTIP, pointFormat: "Attendance: <b>{point.y}%</b>" },
    plotOptions: {
      bar: {
        borderRadius: 0,
        borderWidth: 0,
        color: horizontalGradient(color),
        states: { hover: { brightness: 0.1 } },
        dataLabels: {
          enabled: true,
          format: "{y}%",
          style: { fontSize: "11px", fontWeight: "700", color: CHART_VARS.inkSoft, textOutline: "none" },
        },
      },
    },
    series: [{ type: "bar", name: "Attendance", data: data.map((d) => d.value) }],
  };
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
