import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { listCourses, listSections, listTimetable } from "@/api/academics";
import { extractApiErrorMessage } from "@/api/client";
import { listSessions, openSession } from "@/api/attendance";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TodayClassesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayDow = (new Date().getDay() + 6) % 7; // JS: 0=Sunday -> convert to 0=Monday

  const timetableQuery = useQuery({
    queryKey: ["timetable", "teacher", user?.id],
    queryFn: () => listTimetable({ teacher_id: user!.id }),
    enabled: !!user,
  });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });
  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions", "teacher", user?.id],
    queryFn: () => listSessions({ teacher_id: user!.id }),
    enabled: !!user,
  });

  const openMutation = useMutation({
    mutationFn: (scheduledClassId: string) => openSession(scheduledClassId),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
      navigate(`/teacher/sessions/${session.id}`);
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const todaysClasses = timetableQuery.data?.filter((t) => t.day_of_week === todayDow) ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const openSessionFor = (scheduledClassId: string) =>
    sessionsQuery.data?.find(
      (s) => s.scheduled_class_id === scheduledClassId && s.session_date === today && s.status === "OPEN",
    );

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/teacher") }, { label: "Today's Classes" }]} />
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-ink-faint">Today is {DAYS[todayDow]}</span>
          <BackButton />
        </div>
      </div>

      {todaysClasses.length === 0 && (
        <Card>
          <table className="w-full">
            <tbody>
              <EmptyTableRow colSpan={1} title="No classes scheduled for you today" subtitle="Check back on your next teaching day." />
            </tbody>
          </table>
        </Card>
      )}

      <div className="space-y-3">
        {todaysClasses.map((t) => {
          const existing = openSessionFor(t.id);
          return (
            <Card key={t.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{coursesQuery.data?.find((c) => c.id === t.course_id)?.name ?? t.course_id}</p>
                  <p className="text-[11px] text-ink-faint">
                    {sectionsQuery.data?.find((s) => s.id === t.section_id)?.name} • {t.start_time}–{t.end_time} • Room{" "}
                    {t.room || "TBD"}
                  </p>
                </div>
                {existing ? (
                  <Button onClick={() => navigate(`/teacher/sessions/${existing.id}`)}>Resume session</Button>
                ) : (
                  <Button onClick={() => openMutation.mutate(t.id)} disabled={openMutation.isPending}>
                    Open session
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
