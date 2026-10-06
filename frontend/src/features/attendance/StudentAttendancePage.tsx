import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CheckCircle2, Clock3, ListChecks, MinusCircle, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { listCourses, listSections } from "@/api/academics";
import { getStudentHistory } from "@/api/attendance";
import { listUsers } from "@/api/users";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusColumnChart } from "@/components/charts/StatusColumnChart";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/KpiTile";
import { useAuth } from "@/hooks/useAuth";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/labels";
import { CHART_VARS } from "@/lib/highchartsTheme";
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

export function StudentAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const homePath = user?.role === "ADMIN" ? "/admin" : "/teacher";
  const { studentId } = useParams<{ studentId: string }>();
  const historyQuery = useQuery({
    queryKey: ["student-history", studentId],
    queryFn: () => getStudentHistory(studentId!),
    enabled: !!studentId,
  });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });
  const studentQuery = useQuery({
    queryKey: ["users", "STUDENT", "all"],
    queryFn: () => listUsers({ role: "STUDENT", limit: 200 }),
  });

  const student = studentQuery.data?.items.find((u) => u.id === studentId);
  const history = historyQuery.data ?? [];
  const closedHistory = history.filter((h) => h.session.status === "CLOSED");
  const attended = closedHistory.filter((h) => h.status === "PRESENT" || h.status === "LATE").length;
  const percent = closedHistory.length ? Math.round((attended / closedHistory.length) * 100) : null;

  const courseName = (id: string) => coursesQuery.data?.find((c) => c.id === id)?.name ?? id;
  const sectionName = (id: string) => sectionsQuery.data?.find((s) => s.id === id)?.name ?? id;

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
        value: Math.round((b.present / b.total) * 100),
      }));
  }, [closedHistory]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "Home", onClick: () => navigate(homePath) },
            { label: student?.full_name ?? "Student attendance" },
          ]}
        />
        <BackButton />
      </div>

      {student && (
        <div className="rounded-xl border border-hairline bg-surface px-4 py-3 shadow-sm">
          <p className="text-sm font-bold text-ink">{student.full_name}</p>
          <p className="text-[11px] text-ink-faint">{student.email}</p>
        </div>
      )}

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
          <div className="px-2 py-3">
            <StatusColumnChart data={monthly} seriesName="Attendance" color={CHART_VARS.good} height={220} />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session history</CardTitle>
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
              {history.length === 0 && (
                <EmptyTableRow colSpan={4} title="No attendance records yet" subtitle="Sessions will appear here once a class is held." />
              )}
              {history.map(({ session, status }) => {
                const StatusIcon = STATUS_ICON[status ?? "ABSENT"];
                return (
                  <tr key={session.id} className="odd:bg-surface-alt/30">
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
      </Card>
    </div>
  );
}
