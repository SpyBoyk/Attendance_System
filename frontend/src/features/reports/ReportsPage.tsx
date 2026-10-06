import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, TrendingUp, UserCog } from "lucide-react";
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

import { listDepartments } from "@/api/academics";
import { getOverview } from "@/api/reports";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { DonutWithTotal } from "@/components/ui/donut-with-total";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { KpiTile } from "@/components/KpiTile";
import { useAuth } from "@/hooks/useAuth";
import { CHART_AXIS, CHART_GRID, CHART_LABEL, CHART_LINE } from "@/lib/chart";

const PERIODS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [periodDays, setPeriodDays] = useState(30);
  const [departmentId, setDepartmentId] = useState("");

  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: isAdmin });

  const overviewQuery = useQuery({
    queryKey: ["reports-overview", periodDays, departmentId],
    queryFn: () =>
      getOverview({
        start_date: isoDaysAgo(periodDays),
        department_id: isAdmin && departmentId ? departmentId : undefined,
      }),
  });

  const overview = overviewQuery.data;
  const trendData = useMemo(
    () => (overview?.trend ?? []).map((p) => ({ ...p, label: p.date.slice(5) })),
    [overview],
  );
  const deptData = overview?.by_department ?? [];

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate(isAdmin ? "/admin" : "/teacher") }, { label: "Reports" }]} />
        <BackButton />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} className="w-36">
          {PERIODS.map((p) => (
            <option key={p.days} value={p.days}>
              {p.label}
            </option>
          ))}
        </Select>
        {isAdmin && (
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-44">
            <option value="">All departments</option>
            {departmentsQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile
          label="Attendance rate"
          value={overview?.attendance_rate == null ? "—" : `${overview.attendance_rate}%`}
          icon={TrendingUp}
          accent="brand"
        />
        <KpiTile
          label="Staff attendance"
          value={overview?.staff_attendance_rate == null ? "—" : `${overview.staff_attendance_rate}%`}
          icon={UserCog}
          accent="sky"
          delayMs={40}
        />
        <KpiTile label="Below 75%" value={overview?.defaulters.length ?? 0} icon={AlertTriangle} accent="rose" delayMs={80} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>Attendance rate over time</CardTitle>
          </CardHeader>
          <div className="h-64 px-2 py-3">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">No closed sessions in this period yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="reportsTrendFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#reportsTrendFill)"
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
            <DonutWithTotal value={overview?.attendance_rate ?? 0} label="Students" accent="brand" size={100} />
            <DonutWithTotal value={overview?.staff_attendance_rate ?? 0} label="Staff" accent="sky" size={100} />
          </div>
        </Card>
      </div>

      {deptData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance by department</CardTitle>
          </CardHeader>
          <div className="h-64 px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 20, right: 16, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="reportsDeptFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_LINE} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="department_name" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="rate" fill="url(#reportsDeptFill)" radius={0} maxBarSize={48}>
                  <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} style={CHART_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Students below 75% attendance</CardTitle>
        </CardHeader>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-120 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Student</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Email</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Sessions</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {(overview?.defaulters.length ?? 0) === 0 && (
                <EmptyTableRow colSpan={4} title="No defaulters" subtitle="Every student is at or above 75% attendance in this period." />
              )}
              {overview?.defaulters.map((d) => (
                <tr key={d.student_id} className="odd:bg-surface-alt/30">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-ink">
                    <button
                      type="button"
                      onClick={() => navigate(`/students/${d.student_id}/attendance`)}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {d.full_name}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-ink-faint">{d.email}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-faint">
                    {d.sessions_attended} / {d.sessions_total}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-crit">{d.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {overview && (
        <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
          <CalendarClock className="size-3" />
          {overview.start_date} – {overview.end_date}
        </p>
      )}
    </div>
  );
}
