import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { CalendarDays } from "lucide-react";

import { listCourses, listSections } from "@/api/academics";
import { listSessions } from "@/api/attendance";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortableHeader, type SortDir } from "@/components/SortableHeader";
import { useAuth } from "@/hooks/useAuth";
import { useClientPagination } from "@/hooks/useClientPagination";
import { CHAMFER, CHAMFER_OUTLINE } from "@/lib/shapes";
import { SESSION_STATUS_LABEL } from "@/lib/labels";
import type { SessionStatus } from "@/types";

type SortField = "session_date" | "status";

export function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sessionsQuery = useQuery({
    queryKey: ["attendance-sessions", "teacher", user?.id],
    queryFn: () => listSessions({ teacher_id: user!.id }),
    enabled: !!user,
  });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });

  const courseName = (id: string) => coursesQuery.data?.find((c) => c.id === id)?.name ?? id;
  const sectionName = (id: string) => sectionsQuery.data?.find((sec) => sec.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sessionsQuery.data ?? []).filter((s) => {
      const matchesSearch =
        !q || courseName(s.course_id).toLowerCase().includes(q) || sectionName(s.section_id).toLowerCase().includes(q);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsQuery.data, search, statusFilter, coursesQuery.data, sectionsQuery.data]);
  const sortedItems = useMemo(() => {
    if (!sortField) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filtered, sortField, sortDir]);
  const { page, pageSize, total, pageItems, setPage, setPageSize } = useClientPagination(sortedItems);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/teacher") }, { label: "History" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past sessions</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} className="w-48" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "")} className="w-36">
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </div>
        </CardHeader>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-150 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Date" field="session_date" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Course</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Section</th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={5} title="No sessions yet" subtitle="Open a session from Today's Classes to get started." />}
              {pageItems.map((s) => (
                <tr
                  key={s.id}
                  className="group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 text-brand-600" />
                      {s.session_date}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{courseName(s.course_id)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{sectionName(s.section_id)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={s.status === "OPEN" ? "warn" : "neutral"}>{SESSION_STATUS_LABEL[s.status]}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="outline" size="sm" className={CHAMFER_OUTLINE} onClick={() => navigate(`/teacher/sessions/${s.id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>
    </div>
  );
}
