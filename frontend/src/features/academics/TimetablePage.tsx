import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { CalendarClock, Clock3, MapPin } from "lucide-react";
import { toast } from "sonner";

import { createScheduledClass, deleteScheduledClass, listCourses, listSections, listTimetable } from "@/api/academics";
import { extractApiErrorMessage } from "@/api/client";
import { listUsers } from "@/api/users";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmptyTableRow } from "@/components/ui/empty-state";
import { AddToggleButton, InlineAddPanel } from "@/components/ui/inline-panel";
import { Input, Label, Select } from "@/components/ui/input";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortableHeader, type SortDir } from "@/components/SortableHeader";
import { useClientPagination } from "@/hooks/useClientPagination";
import { cn } from "@/lib/cn";
import { CHAMFER, CHAMFER_OUTLINE } from "@/lib/shapes";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type SortField = "day_of_week" | "start_time" | "room";

export function TimetablePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    course_id: "",
    section_id: "",
    teacher_id: "",
    room: "",
    day_of_week: 0,
    start_time: "09:00",
    end_time: "10:00",
    academic_year: "2025-26",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
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

  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });
  const teachersQuery = useQuery({ queryKey: ["users", "TEACHER"], queryFn: () => listUsers({ role: "TEACHER", limit: 200 }) });
  const timetableQuery = useQuery({ queryKey: ["timetable"], queryFn: () => listTimetable({}) });

  const courseLabel = (id: string) => coursesQuery.data?.find((c) => c.id === id)?.code ?? id;
  const sectionLabel = (id: string) => sectionsQuery.data?.find((s) => s.id === id)?.name ?? id;
  const teacherLabel = (id: string) => teachersQuery.data?.items.find((t) => t.id === id)?.full_name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (timetableQuery.data ?? []).filter((t) => {
      const matchesSearch =
        !q ||
        courseLabel(t.course_id).toLowerCase().includes(q) ||
        sectionLabel(t.section_id).toLowerCase().includes(q) ||
        teacherLabel(t.teacher_id).toLowerCase().includes(q) ||
        t.room.toLowerCase().includes(q);
      const matchesDay = dayFilter === "" || t.day_of_week === Number(dayFilter);
      return matchesSearch && matchesDay;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableQuery.data, search, dayFilter, coursesQuery.data, sectionsQuery.data, teachersQuery.data]);
  const sortedItems = useMemo(() => {
    if (!sortField) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filtered, sortField, sortDir]);
  const { page, pageSize, total, pageItems, setPage, setPageSize } = useClientPagination(sortedItems);

  const allIds = sortedItems.map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createScheduledClass({
        ...form,
        start_time: `${form.start_time}:00`,
        end_time: `${form.end_time}:00`,
      }),
    onSuccess: () => {
      toast.success("Class scheduled");
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledClass(id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteScheduledClass(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`Removed ${ids.length} scheduled class(es)`);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Timetable" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} className="w-48" />
            <Select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="w-36">
              <option value="">All days</option>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <AddToggleButton label="Schedule class" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
          </div>
        </CardHeader>

        <InlineAddPanel open={addOpen}>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="tt-course">Course</Label>
              <Select id="tt-course" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
                <option value="">Select...</option>
                {coursesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tt-section">Section</Label>
              <Select id="tt-section" value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })} required>
                <option value="">Select...</option>
                {sectionsQuery.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tt-teacher">Teacher</Label>
              <Select id="tt-teacher" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required>
                <option value="">Select...</option>
                {teachersQuery.data?.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tt-room">Room</Label>
              <Input id="tt-room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tt-day">Day</Label>
              <Select
                id="tt-day"
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tt-start">Start time</Label>
              <Input id="tt-start" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tt-end">End time</Label>
              <Input id="tt-end" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </div>
          </form>
        </InlineAddPanel>

        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-brand-50 px-4 py-2.5">
            <p className="text-xs font-semibold text-brand-700">{selected.size} selected</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className={CHAMFER} onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button variant="destructive" size="sm" className={CHAMFER} onClick={() => setBulkConfirmOpen(true)}>
                Delete selected
              </Button>
            </div>
          </div>
        )}

        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-200 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleSelectAll} className="size-3.5" />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Day" field="day_of_week" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Time" field="start_time" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Course</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Section</th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Teacher</th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Room" field="room" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={8} title="Nothing scheduled yet" subtitle="Schedule your first class above." />}
              {pageItems.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    "group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50",
                    selected.has(t.id) && "bg-brand-50",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${courseLabel(t.course_id)} on ${DAYS[t.day_of_week]}`}
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelectOne(t.id)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">
                    <span className="flex items-center gap-2">
                      <CalendarClock className="size-3.5 text-brand-600" />
                      {DAYS[t.day_of_week]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px] whitespace-nowrap text-ink">
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5 text-ink-faint" />
                      {t.start_time}–{t.end_time}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{courseLabel(t.course_id)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{sectionLabel(t.section_id)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{teacherLabel(t.teacher_id)}</td>
                  <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-ink-faint">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {t.room}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="outline" size="sm" className={CHAMFER_OUTLINE} onClick={() => setPendingDelete(t.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      {pendingDelete && (
        <ConfirmModal
          message="Remove this scheduled class? This cannot be undone."
          confirmLabel="Remove"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          message={`Remove ${selected.size} selected scheduled class(es)? This cannot be undone.`}
          confirmLabel="Remove"
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate([...selected])}
        />
      )}
    </div>
  );
}
