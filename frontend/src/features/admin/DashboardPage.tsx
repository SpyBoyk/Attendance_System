import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, TrendingUp, UserCog, Users } from "lucide-react";
import { useNavigate } from "react-router";

import { listDepartments } from "@/api/academics";
import { listUsers } from "@/api/users";
import { getOverview } from "@/api/reports";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";
import { EmptyState } from "@/components/charts/EmptyState";
import { Select } from "@/components/ui/input";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { StatusColumnChart } from "@/components/charts/StatusColumnChart";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { KpiTile } from "@/components/KpiTile";
import { CHART_VARS } from "@/lib/highchartsTheme";
import { CHAMFER_OUTLINE } from "@/lib/shapes";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [studentDept, setStudentDept] = useState("");
  const [staffDept, setStaffDept] = useState("");
  const studentsQuery = useQuery({ queryKey: ["users", "STUDENT"], queryFn: () => listUsers({ role: "STUDENT", limit: 1 }) });
  const teachersQuery = useQuery({ queryKey: ["users", "TEACHER"], queryFn: () => listUsers({ role: "TEACHER", limit: 1 }) });
  const hodsQuery = useQuery({ queryKey: ["users", "HOD"], queryFn: () => listUsers({ role: "HOD", limit: 1 }) });
  const staffCount =
    teachersQuery.data && hodsQuery.data ? teachersQuery.data.total + hodsQuery.data.total : undefined;
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const overviewQuery = useQuery({
    queryKey: ["reports-overview", 30],
    queryFn: () => getOverview({ start_date: isoDaysAgo(30) }),
  });
  const studentOverviewQuery = useQuery({
    queryKey: ["reports-overview", 30, "student-dept", studentDept],
    queryFn: () => getOverview({ start_date: isoDaysAgo(30), department_id: studentDept || undefined }),
  });
  const staffOverviewQuery = useQuery({
    queryKey: ["reports-overview", 30, "staff-dept", staffDept],
    queryFn: () => getOverview({ start_date: isoDaysAgo(30), department_id: staffDept || undefined }),
  });
  const overview = overviewQuery.data;
  const trendData = (overview?.trend ?? []).map((p) => ({ label: p.date.slice(5), value: p.rate }));
  const deptData = (overview?.by_department ?? []).map((d) => ({ label: d.department_name, value: d.rate }));

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Dashboard" }]} />
        <BackButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Students" value={studentsQuery.data?.total ?? "…"} icon={Users} accent="brand" />
        <KpiTile label="Teachers" value={teachersQuery.data?.total ?? "…"} icon={UserCog} accent="sky" delayMs={40} />
        <KpiTile label="Staff" value={staffCount ?? "…"} icon={UserCog} accent="amber" delayMs={80} />
        <KpiTile
          label="Attendance rate"
          value={overview?.attendance_rate == null ? "—" : `${overview.attendance_rate}%`}
          icon={TrendingUp}
          accent="emerald"
          delayMs={120}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance rate — last 30 days</CardTitle>
            <Button variant="outline" size="sm" className={CHAMFER_OUTLINE} onClick={() => navigate("/reports")}>
              Full report
            </Button>
          </CardHeader>
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} />
            ) : trendData.length === 0 ? (
              <EmptyState label="No closed sessions in this period yet." height={240} />
            ) : (
              <TrendAreaChart
                data={trendData}
                seriesName="Attendance"
                color={CHART_VARS.brand}
                valueSuffix="%"
                yMin={0}
                yMax={100}
                height={240}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
          </CardHeader>
          <div className="px-2 py-3">
            {overviewQuery.isLoading ? (
              <ChartSkeleton height={240} />
            ) : deptData.length === 0 ? (
              <EmptyState label="No data yet." height={240} />
            ) : (
              <StatusColumnChart data={deptData} seriesName="Attendance" color={CHART_VARS.brand} height={240} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student attendance</CardTitle>
            <Select value={studentDept} onChange={(e) => setStudentDept(e.target.value)} className="w-40" icon={Building2}>
              <option value="">All departments</option>
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </CardHeader>
          <div className="flex items-center justify-center px-2 py-8">
            {studentOverviewQuery.isLoading ? (
              <ChartSkeleton height={150} variant="donut" />
            ) : (
              <RadialGauge
                percent={studentOverviewQuery.data?.attendance_rate ?? 0}
                label="Students"
                color={CHART_VARS.good}
                size={150}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff attendance</CardTitle>
            <Select value={staffDept} onChange={(e) => setStaffDept(e.target.value)} className="w-40" icon={Building2}>
              <option value="">All departments</option>
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </CardHeader>
          <div className="flex items-center justify-center px-2 py-8">
            {staffOverviewQuery.isLoading ? (
              <ChartSkeleton height={150} variant="donut" />
            ) : (
              <RadialGauge
                percent={staffOverviewQuery.data?.staff_attendance_rate ?? 0}
                label="Staff"
                color={CHART_VARS.warn}
                size={150}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
