import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Building2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import {
  createSection,
  deleteSection,
  enrollStudents,
  getRoster,
  listCourses,
  listDepartments,
  listSections,
} from "@/api/academics";
import { extractApiErrorMessage } from "@/api/client";
import { listUsers } from "@/api/users";
import { BackButton } from "@/components/BackButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
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

type SortField = "name" | "academic_year";

export function SectionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", department_id: "", academic_year: "2025-26", year_level: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [enrollTarget, setEnrollTarget] = useState<{ sectionId: string; courseId: string } | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
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

  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const sectionsQuery = useQuery({ queryKey: ["sections"], queryFn: () => listSections() });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const studentsQuery = useQuery({
    queryKey: ["users", "STUDENT"],
    queryFn: () => listUsers({ role: "STUDENT", limit: 200 }),
  });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sectionsQuery.data ?? []).filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q);
      const matchesDept = !departmentFilter || s.department_id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [sectionsQuery.data, search, departmentFilter]);
  const sortedItems = useMemo(() => {
    if (!sortField) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortField].toLowerCase();
      const bv = b[sortField].toLowerCase();
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filtered, sortField, sortDir]);
  const { page, pageSize, total, pageItems, setPage, setPageSize } = useClientPagination(sortedItems);

  const allIds = sortedItems.map((s) => s.id);
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

  const rosterQuery = useQuery({
    queryKey: ["roster", enrollTarget?.sectionId],
    queryFn: () => getRoster(enrollTarget!.sectionId),
    enabled: !!enrollTarget,
  });

  const createMutation = useMutation({
    mutationFn: () => createSection(form),
    onSuccess: () => {
      toast.success("Section created");
      setForm({ name: "", department_id: "", academic_year: "2025-26", year_level: 1 });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteSection(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`Deleted ${ids.length} section(s)`);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollStudents(enrollTarget!.sectionId, {
        student_ids: selectedStudents,
        course_id: enrollTarget!.courseId,
        academic_year: form.academic_year,
      }),
    onSuccess: () => {
      toast.success("Students enrolled");
      setSelectedStudents([]);
      queryClient.invalidateQueries({ queryKey: ["roster", enrollTarget?.sectionId] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const departmentCode = (id: string) => departmentsQuery.data?.find((d) => d.id === id)?.code ?? id;
  const enrolledIds = new Set(rosterQuery.data?.map((r) => r.student_id));

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Sections & Roster" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All sections</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} className="w-48" />
            <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-36" icon={Building2}>
              <option value="">All departments</option>
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <AddToggleButton label="Add section" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
          </div>
        </CardHeader>

        <InlineAddPanel open={addOpen}>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="section-name">Name</Label>
              <Input id="section-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="section-dept">Department</Label>
              <Select
                id="section-dept"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                required
              >
                <option value="">Select...</option>
                {departmentsQuery.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="section-year">Academic year</Label>
              <Input
                id="section-year"
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="section-level">Year level</Label>
              <Input
                id="section-level"
                type="number"
                min={1}
                value={form.year_level}
                onChange={(e) => setForm({ ...form, year_level: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Adding..." : "Add section"}
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
          <table className="w-full min-w-150 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleSelectAll} className="size-3.5" />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Department</th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Year" field="academic_year" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={5} title="No sections yet" subtitle="Add your first section above." />}
              {pageItems.map((s) => (
                <tr
                  key={s.id}
                  className={cn(
                    "group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50",
                    selected.has(s.id) && "bg-brand-50",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.name}`}
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelectOne(s.id)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-ink">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="size-3.5 text-brand-600" />
                      {s.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-ink-faint">{departmentCode(s.department_id)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{s.academic_year}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(CHAMFER_OUTLINE, "mr-2")}
                      onClick={() => {
                        setEnrollTarget({ sectionId: s.id, courseId: coursesQuery.data?.[0]?.id ?? "" });
                        setSelectedStudents([]);
                      }}
                    >
                      Manage roster
                    </Button>
                    <Button variant="outline" size="sm" className={CHAMFER_OUTLINE} onClick={() => setPendingDelete({ id: s.id, name: s.name })}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </Card>

      {enrollTarget && (
        <Card>
          <CardHeader>
            <CardTitle>Enroll students into {sectionsQuery.data?.find((s) => s.id === enrollTarget.sectionId)?.name}</CardTitle>
          </CardHeader>
          <CardBody>
            <Label htmlFor="enroll-course">Course</Label>
            <Select
              id="enroll-course"
              value={enrollTarget.courseId}
              onChange={(e) => setEnrollTarget({ ...enrollTarget, courseId: e.target.value })}
            >
              {coursesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </Select>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-none border border-hairline-strong">
              {studentsQuery.data?.items.map((s) => (
                <label
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2 text-xs last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id) || enrolledIds.has(s.id)}
                    disabled={enrolledIds.has(s.id)}
                    onChange={(e) =>
                      setSelectedStudents((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.full_name} <span className="text-ink-faint">({s.email})</span>
                  {enrolledIds.has(s.id) && <span className="text-[11px] text-good">already enrolled</span>}
                </label>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className={CHAMFER} onClick={() => setEnrollTarget(null)}>
                Close
              </Button>
              <Button
                disabled={selectedStudents.length === 0 || enrollMutation.isPending}
                onClick={() => enrollMutation.mutate()}
              >
                Enroll {selectedStudents.length || ""} student(s)
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {pendingDelete && (
        <ConfirmModal
          message={`Delete section "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          message={`Delete ${selected.size} selected section(s)? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate([...selected])}
        />
      )}
    </div>
  );
}
