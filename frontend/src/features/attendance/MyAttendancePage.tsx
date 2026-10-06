import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CheckCircle2, Clock3, ListChecks, MinusCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { listCourses, listSections } from "@/api/academics";
import { getMyHistory } from "@/api/attendance";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { KpiTile } from "@/components/KpiTile";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/ui/search-input";
import { useClientPagination } from "@/hooks/useClientPagination";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/labels";
import { CHART_AXIS, CHART_GRID, CHART_LABEL, CHART_LINE } from "@/lib/chart";
import type { AttendanceStatus } from "@/types";

const STATUS_VARIANT: Record<AttendanceStatus, "good" | "warn" | "neutral"> = {
  PRESENT: "good",
  LATE: "warn",
  EXCUSED: "neutral",
};

const STATUS_ICON: Record<AttendanceStatus | "ABSENT", typeof CheckCircle2> = {
  PRESENT: CheckCircle2,
  LATE: Clock3,
  EXCUSED: MinusCircle,
  ABSENT: XCircle,
};

export function MyAttendancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ABSENT" | "">("");
  const historyQuery = useQuery({ queryKey: ["my-history"], queryFn: getMyHistory });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });

  const history = historyQuery.data ?? [];
  const closedHistory = history.filter((h) => h.session.status === "CLOSED");
  const attended = closedHistory.filter((h) => h.status === "PRESENT" || h.status === "LATE").length;
  const percent = closedHistory.length ? Math.round((attended / closedHistory.length) * 100) : null;

  const courseName = (id: string) => coursesQuery.data?.find((c) => c.id === id)?.name ?? id;
  const sectionName = (id: string) => sectionsQuery.data?.find((s) => s.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter(({ session, status }) => {
      const matchesSearch =
        !q || courseName(session.course_id).toLowerCase().includes(q) || sectionName(session.section_id).toLowerCase().includes(q);
      const matchesStatus = !statusFilter || (status ?? "ABSENT") === statusFilter;
      return matchesSearch && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, search, statusFilter, coursesQuery.data, sectionsQuery.data]);
  const { page, pageSize, total, pageItems, setPage, setPageSize } = useClientPagination(filtered);

  const monthly = useMemo(() => {
    const buckets = new Map<string, { present: number; total: number }>();
    for (const { session, status } of closedHistory) {
      const month = session.session_date.slice(0, 7);
      const bucket = buckets.get(month) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (status === "PRESENT" || status === "LATE") bucket.present += 1;
      buckets.set(month, bucket);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, b]) => ({
        label: new Date(`${month}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        rate: Math.round((b.present / b.total) * 100),
      }));
  }, [closedHistory]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/student") }, { label: "My Attendance" }]} />
        <BackButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label="Attendance" value={percent === null ? "—" : `${percent}%`} icon={CheckCircle2} accent="emerald" />
        <KpiTile label="Sessions attended" value={attended} icon={CalendarCheck2} accent="sky" delayMs={40} />
        <KpiTile label="Completed sessions" value={closedHistory.length} icon={ListChecks} accent="brand" delayMs={80} />
      </div>

      {monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly attendance</CardTitle>
          </CardHeader>
          <div className="h-56 px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 20, right: 16, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="myAttendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_LINE} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="rate" fill="url(#myAttendanceFill)" radius={0} maxBarSize={40}>
                  <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} style={CHART_LABEL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session history</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} className="w-48" />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | "ABSENT" | "")}
              className="w-36"
            >
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
              <option value="ABSENT">Absent</option>
            </Select>
          </div>
        </CardHeader>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-150 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Date</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Course</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Section</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={4} title="No attendance records yet" subtitle="Your sessions will appear here once a class is held." />}
              {pageItems.map(({ session, status }) => {
                const StatusIcon = STATUS_ICON[status ?? "ABSENT"];
                return (
                  <tr
                    key={session.id}
                    className="group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink">{session.session_date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink">{courseName(session.course_id)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink">{sectionName(session.section_id)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={status ? STATUS_VARIANT[status] : "crit"} className="gap-1">
                        <StatusIcon className="size-3" />
                        {ATTENDANCE_STATUS_LABEL[status ?? "ABSENT"]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
