import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarClock, TrendingUp, UserCog } from "lucide-react";
import { useNavigate } from "react-router";

import { listDepartments } from "@/api/academics";
import { getOverview } from "@/api/reports";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { DefaulterBarChart } from "@/components/charts/DefaulterBarChart";
import { EmptyState } from "@/components/charts/EmptyState";
import { StatusColumnChart } from "@/components/charts/StatusColumnChart";
import { StatusDonutChart } from "@/components/charts/StatusDonutChart";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { Pagination } from "@/components/Pagination";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { KpiTile } from "@/components/KpiTile";
import { useAuth } from "@/hooks/useAuth";
import { useClientPagination } from "@/hooks/useClientPagination";
import { CHART_VARS } from "@/lib/highchartsTheme";

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
    () => (overview?.trend ?? []).map((p) => ({ label: p.date.slice(5), value: p.rate })),
    [overview],
  );
  const deptData = (overview?.by_department ?? []).map((d) => ({ label: d.department_name, value: d.rate }));
  const weekdayData = (overview?.by_weekday ?? []).map((w) => ({ label: w.weekday_name.slice(0, 3), value: w.rate }));
  const staffDeptData = (overview?.staff_by_department ?? []).map((d) => ({ label: d.department_name, value: d.rate }));
  const defaulterChartData = (overview?.defaulters ?? [])
    .slice(0, 8)
    .map((d) => ({ label: d.full_name, value: d.rate }))
    .reverse();
  const statusData = overview
    ? [
        { name: "Present", y: overview.status_breakdown.present, color: CHART_VARS.good },
        { name: "Late", y: overview.status_breakdown.late, color: CHART_VARS.warn },
        { name: "Excused", y: overview.status_breakdown.excused, color: CHART_VARS.brand },
        { name: "Absent", y: overview.status_breakdown.absent, color: CHART_VARS.crit },
      ].filter((d) => d.y > 0)
    : [];
  const glanceData = [
    { label: "Students", value: overview?.attendance_rate ?? 0 },
    { label: "Staff", value: overview?.staff_attendance_rate ?? 0 },
  ];
  const [defaulterSearch, setDefaulterSearch] = useState("");
  const defaulters = useMemo(() => {
    const q = defaulterSearch.trim().toLowerCase();
    const all = overview?.defaulters ?? [];
    if (!q) return all;
    return all.filter((d) => d.full_name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
  }, [overview, defaulterSearch]);
  const {
    page: defaulterPage,
    pageSize: defaulterPageSize,
    total: defaulterTotal,
    pageItems: defaulterPageItems,
    setPage: setDefaulterPage,
    setPageSize: setDefaulterPageSize,
  } = useClientPagination(defaulters);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate(isAdmin ? "/admin" : "/teacher") }, { label: "Reports" }]} />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodDays} onChange={(e) => setPeriodDays(Number(e.target.value))} className="w-36">
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
          </Select>
          {isAdmin && (
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-44" icon={Building2}>
              <option value="">All departments</option>
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <BackButton />
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
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} />
            ) : trendData.length === 0 ? (
              <EmptyState label="No closed sessions in this period yet." height={240} />
            ) : (
              <TrendAreaChart data={trendData} seriesName="Attendance" color={CHART_VARS.brand} valueSuffix="%" yMin={0} yMax={100} height={240} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} />
            ) : (
              <StatusColumnChart data={glanceData} seriesName="Attendance" color={CHART_VARS.brand} height={240} />
            )}
          </div>
        </Card>
      </div>

      {deptData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance by department</CardTitle>
          </CardHeader>
          <div className="px-2 py-3">
            <StatusColumnChart data={deptData} seriesName="Attendance" color={CHART_VARS.brand} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-in breakdown</CardTitle>
          </CardHeader>
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} variant="donut" />
            ) : statusData.length === 0 ? (
              <EmptyState label="No closed sessions in this period yet." height={240} />
            ) : (
              <StatusDonutChart data={statusData} height={240} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance by day of week</CardTitle>
          </CardHeader>
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} />
            ) : weekdayData.length === 0 ? (
              <EmptyState label="No closed sessions in this period yet." height={240} />
            ) : (
              <StatusColumnChart data={weekdayData} seriesName="Attendance" color={CHART_VARS.brand} height={240} />
            )}
          </div>
        </Card>

        {staffDeptData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Staff attendance by department</CardTitle>
            </CardHeader>
            <div className="px-2 py-3">
              <StatusColumnChart data={staffDeptData} seriesName="Staff attendance" color={CHART_VARS.warn} height={240} />
            </div>
          </Card>
        )}

        {defaulterChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lowest attendance</CardTitle>
            </CardHeader>
            <div className="px-2 py-3">
              <DefaulterBarChart data={defaulterChartData} height={Math.max(180, defaulterChartData.length * 32)} />
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students below 75% attendance</CardTitle>
          <SearchInput value={defaulterSearch} onChange={setDefaulterSearch} className="w-48" />
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
              {defaulterTotal === 0 && (
                <EmptyTableRow colSpan={4} title="No defaulters" subtitle="Every student is at or above 75% attendance in this period." />
              )}
              {defaulterPageItems.map((d) => (
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
        <Pagination
          page={defaulterPage}
          pageSize={defaulterPageSize}
          total={defaulterTotal}
          onPageChange={setDefaulterPage}
          onPageSizeChange={setDefaulterPageSize}
        />
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
