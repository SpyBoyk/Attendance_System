import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, MinusCircle, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { extractApiErrorMessage } from "@/api/client";
import { closeSession, getSession, getSessionRoster, manualCheckIn, removeCheckIn } from "@/api/attendance";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveFaceCapture } from "@/components/LiveFaceCapture";
import { SearchInput } from "@/components/ui/search-input";
import { ATTENDANCE_STATUS_LABEL, SESSION_STATUS_LABEL } from "@/lib/labels";
import { CHAMFER } from "@/lib/shapes";
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

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const sessionQuery = useQuery({
    queryKey: ["attendance-session", sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
  });
  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", sessionId],
    queryFn: () => getSessionRoster(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  const checkInMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: AttendanceStatus }) =>
      manualCheckIn(sessionId!, studentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-roster", sessionId] }),
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const markAbsentMutation = useMutation({
    mutationFn: (studentId: string) => removeCheckIn(sessionId!, studentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-roster", sessionId] }),
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeSession(sessionId!),
    onSuccess: () => {
      toast.success("Session closed");
      navigate("/teacher");
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const session = sessionQuery.data;
  const roster = rosterQuery.data ?? [];
  const presentCount = roster.filter((r) => r.event).length;
  const isOpen = session?.status === "OPEN";

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [roster, search]);

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/teacher") }, { label: "Today's Classes", onClick: () => navigate("/teacher") }, { label: "Live Attendance" }]} />
        <BackButton />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface px-3 py-2.5 shadow-sm">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-ink">Live Attendance</h2>
          <p className="truncate text-[11px] text-ink-faint">
            {presentCount} / {roster.length} marked • Session {session ? SESSION_STATUS_LABEL[session.status] : "..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isOpen && (
            <Button variant="destructive" size="sm" className={CHAMFER} onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              Close session
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <LiveFaceCapture
          sessionId={sessionId!}
          roster={roster}
          onRecognized={() => queryClient.invalidateQueries({ queryKey: ["attendance-roster", sessionId] })}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <SearchInput value={search} onChange={setSearch} className="w-48" />
        </CardHeader>
        <div className="divide-y divide-hairline">
          {filteredRoster.map((entry) => {
            const StatusIcon = STATUS_ICON[entry.event?.status ?? "ABSENT"];
            return (
            <div
              key={entry.student_id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={entry.full_name} />
                <div>
                  <p className="text-sm font-medium text-ink">{entry.full_name}</p>
                  <p className="text-[11px] text-ink-faint">{entry.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {entry.event ? (
                  <Badge variant={STATUS_VARIANT[entry.event.status]} className="gap-1">
                    <StatusIcon className="size-3" />
                    {ATTENDANCE_STATUS_LABEL[entry.event.status]}
                  </Badge>
                ) : (
                  <Badge variant="crit" className="gap-1">
                    <StatusIcon className="size-3" />
                    {ATTENDANCE_STATUS_LABEL.ABSENT}
                  </Badge>
                )}
                {isOpen && (
                  <div className="flex flex-wrap gap-1">
                    {(["PRESENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={entry.event?.status === status ? "primary" : "outline"}
                        className={CHAMFER}
                        onClick={() => checkInMutation.mutate({ studentId: entry.student_id, status })}
                      >
                        {status[0]}
                      </Button>
                    ))}
                    {entry.event && (
                      <Button size="sm" variant="ghost" className={CHAMFER} onClick={() => markAbsentMutation.mutate(entry.student_id)}>
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
          {roster.length === 0 && <p className="py-6 text-center text-sm text-ink-faint">No students enrolled in this section.</p>}
          {roster.length > 0 && filteredRoster.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-faint">No students match your search.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
