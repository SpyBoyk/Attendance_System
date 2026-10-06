import { HighchartsReact } from "highcharts-react-official";

import Highcharts, { REPORT_TOOLTIP, ensureHighchartsTheme } from "@/lib/highchartsTheme";

ensureHighchartsTheme();

/** A multi-slice donut breakdown (e.g. Present/Late/Excused/Absent) -- the
 * DOMS reference app's "DonutWithTotal" shape, for the one place in this
 * app that actually has named categories summing to a count (status
 * breakdown) rather than a single rate (which RadialGauge already covers). */
export function StatusDonutChart({
  data,
  height = 240,
}: {
  data: { name: string; y: number; color: string }[];
  height?: number;
}) {
  const options: Highcharts.Options = {
    chart: { type: "pie", height },
    tooltip: { ...REPORT_TOOLTIP, pointFormat: "<b>{point.y}</b> ({point.percentage:.1f}%)" },
    plotOptions: {
      pie: {
        innerSize: "68%",
        borderWidth: 2,
        borderColor: "rgb(var(--surface))",
        dataLabels: { enabled: false },
      },
    },
    legend: { enabled: true },
    series: [{ type: "pie", name: "Check-ins", data }],
  };
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
