import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingUp, UserCog, Users } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listUsers } from "@/api/users";
import { getOverview } from "@/api/reports";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { DonutWithTotal } from "@/components/ui/donut-with-total";
import { KpiTile } from "@/components/KpiTile";
import { CHART_AXIS, CHART_GRID, CHART_LABEL, CHART_LINE } from "@/lib/chart";
import { CHAMFER } from "@/lib/shapes";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const studentsQuery = useQuery({ queryKey: ["users", "STUDENT"], queryFn: () => listUsers({ role: "STUDENT", limit: 1 }) });
  const teachersQuery = useQuery({ queryKey: ["users", "TEACHER"], queryFn: () => listUsers({ role: "TEACHER", limit: 1 }) });
  const overviewQuery = useQuery({
    queryKey: ["reports-overview", 30],
    queryFn: () => getOverview({ start_date: isoDaysAgo(30) }),
  });
  const overview = overviewQuery.data;
  const trendData = (overview?.trend ?? []).map((p) => ({ ...p, label: p.date.slice(5) }));
  const deptData = overview?.by_department ?? [];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Dashboard" }]} />
        <BackButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiTile label="Students" value={studentsQuery.data?.total ?? "…"} icon={Users} accent="brand" />
        <KpiTile label="Teachers" value={teachersQuery.data?.total ?? "…"} icon={UserCog} accent="sky" delayMs={40} />
        <KpiTile
          label="Attendance rate"
          value={overview?.attendance_rate == null ? "—" : `${overview.attendance_rate}%`}
          icon={TrendingUp}
          accent="emerald"
          delayMs={80}
        />
        <KpiTile
          label="Staff attendance"
          value={overview?.staff_attendance_rate == null ? "—" : `${overview.staff_attendance_rate}%`}
          icon={UserCog}
          accent="amber"
          delayMs={120}
        />
        <KpiTile label="Below 75%" value={overview?.defaulters.length ?? 0} icon={AlertTriangle} accent="rose" delayMs={160} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance rate — last 30 days</CardTitle>
            <Button variant="outline" size="sm" className={CHAMFER} onClick={() => navigate("/reports")}>
              Full report
            </Button>
          </CardHeader>
          <div className="h-64 px-2 py-3">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">No closed sessions in this period yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_LINE} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: CHART_AXIS }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke={CHART_LINE}
                    strokeWidth={2}
                    fill="url(#dashTrendFill)"
                    dot={{ r: 3, fill: CHART_LINE, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-around gap-2 px-2 py-6">
            <DonutWithTotal value={overview?.attendance_rate ?? 0} label="Students" accent="emerald" />
            <DonutWithTotal value={overview?.staff_attendance_rate ?? 0} label="Staff" accent="amber" />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
          </CardHeader>
          <div className="h-64 px-2 py-3">
            {deptData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="dashDeptFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_LINE} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="department_name"
                    tick={{ fontSize: 10, fill: CHART_AXIS }}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="rate" fill="url(#dashDeptFill)" radius={0} maxBarSize={40}>
                    <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} style={CHART_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
