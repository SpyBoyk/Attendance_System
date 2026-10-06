import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Clock3, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { checkInStaff, checkOutStaff, getMyStaffAttendance } from "@/api/staffAttendance";
import { extractApiErrorMessage } from "@/api/client";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/KpiTile";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function StaffAttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({ queryKey: ["staff-attendance-me"], queryFn: () => getMyStaffAttendance() });
  const records = historyQuery.data ?? [];
  const today = todayIso();
  const todayRecord = records.find((r) => r.date === today) ?? null;

  const checkInMutation = useMutation({
    mutationFn: checkInStaff,
    onSuccess: () => {
      toast.success("Checked in");
      queryClient.invalidateQueries({ queryKey: ["staff-attendance-me"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutStaff,
    onSuccess: () => {
      toast.success("Checked out");
      queryClient.invalidateQueries({ queryKey: ["staff-attendance-me"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const daysPresent = records.length;
  const lastCheckIn = todayRecord ? formatTime(todayRecord.check_in_at) : "—";

  const sorted = useMemo(() => [...records].sort((a, b) => b.date.localeCompare(a.date)), [records]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/teacher") }, { label: "My Attendance" }]} />
        <BackButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile label="Days present" value={daysPresent} icon={CalendarCheck2} accent="brand" />
        <KpiTile label="Today" value={todayRecord ? "Checked in" : "Not yet"} icon={Clock3} accent={todayRecord ? "emerald" : "amber"} delayMs={40} />
        <KpiTile label="Check-in time" value={lastCheckIn} icon={LogIn} accent="sky" delayMs={80} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          {!todayRecord ? (
            <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
              <LogIn className="size-3.5" />
              Check in
            </Button>
          ) : !todayRecord.check_out_at ? (
            <>
              <p className="text-sm text-ink-faint">Checked in at {formatTime(todayRecord.check_in_at)}</p>
              <Button variant="outline" onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}>
                <LogOut className="size-3.5" />
                Check out
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-faint">
              Checked in {formatTime(todayRecord.check_in_at)} · checked out {formatTime(todayRecord.check_out_at)}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-100 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Date</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Check in</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Check out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sorted.length === 0 && (
                <EmptyTableRow colSpan={3} title="No attendance recorded yet" subtitle="Check in above to start your record." />
              )}
              {sorted.map((r) => (
                <tr key={r.id} className="odd:bg-surface-alt/30">
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{r.date}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-faint">{formatTime(r.check_in_at)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-faint">{formatTime(r.check_out_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
