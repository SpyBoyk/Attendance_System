import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Building2, Layers } from "lucide-react";
import { toast } from "sonner";

import { createCourse, deleteCourse, listCourses, listDepartments } from "@/api/academics";
import { extractApiErrorMessage } from "@/api/client";
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

type SortField = "code" | "name" | "credits";

export function CoursesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", department_id: "", credits: 4, semester: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
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
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: () => listCourses() });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (coursesQuery.data ?? []).filter((c) => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      const matchesDept = !departmentFilter || c.department_id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [coursesQuery.data, search, departmentFilter]);
  const sortedItems = useMemo(() => {
    if (!sortField) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).toLowerCase() < String(bv).toLowerCase() ? -1 : String(av).toLowerCase() > String(bv).toLowerCase() ? 1 : 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filtered, sortField, sortDir]);
  const { page, pageSize, total, pageItems, setPage, setPageSize } = useClientPagination(sortedItems);

  const allIds = sortedItems.map((c) => c.id);
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
    mutationFn: () => createCourse(form),
    onSuccess: () => {
      toast.success("Course created");
      setForm({ code: "", name: "", department_id: "", credits: 4, semester: 1 });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteCourse(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`Deleted ${ids.length} course(s)`);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const departmentName = (id: string) => departmentsQuery.data?.find((d) => d.id === id)?.code ?? id;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Courses" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All courses</CardTitle>
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
            <AddToggleButton label="Add course" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
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
              <Label htmlFor="course-code">Code</Label>
              <Input id="course-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="course-name">Name</Label>
              <Input id="course-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="course-dept">Department</Label>
              <Select
                id="course-dept"
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
              <Label htmlFor="course-credits">Credits</Label>
              <Input
                id="course-credits"
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Adding..." : "Add course"}
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
                  <SortableHeader label="Code" field="code" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Department</th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Credits" field="credits" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={6} title="No courses yet" subtitle="Add your first course above." />}
              {pageItems.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    "group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50",
                    selected.has(c.id) && "bg-brand-50",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.name}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelectOne(c.id)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-ink">
                    <span className="flex items-center gap-2">
                      <Layers className="size-3.5 text-brand-600" />
                      {c.code}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{c.name}</td>
                  <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-ink-faint">{departmentName(c.department_id)}</td>
                  <td className="px-3 py-2.5">{c.credits}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="outline" size="sm" className={CHAMFER_OUTLINE} onClick={() => setPendingDelete({ id: c.id, name: c.name })}>
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

      {pendingDelete && (
        <ConfirmModal
          message={`Delete course "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          message={`Delete ${selected.size} selected course(s)? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate([...selected])}
        />
      )}
    </div>
  );
}
