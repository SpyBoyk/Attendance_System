import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { createDepartment, deleteDepartment, listDepartments, updateDepartment } from "@/api/academics";
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
import { CHAMFER } from "@/lib/shapes";

type SortField = "code" | "name";

export function DepartmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
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
  const hodsQuery = useQuery({ queryKey: ["users", "HOD"], queryFn: () => listUsers({ role: "HOD", limit: 200 }) });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departmentsQuery.data ?? [];
    return (departmentsQuery.data ?? []).filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
    );
  }, [departmentsQuery.data, search]);
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

  const allIds = sortedItems.map((d) => d.id);
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
    mutationFn: () => createDepartment(form),
    onSuccess: () => {
      toast.success("Department created");
      setForm({ name: "", code: "" });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const setHodMutation = useMutation({
    mutationFn: ({ id, hodUserId }: { id: string; hodUserId: string | null }) =>
      updateDepartment(id, { hod_user_id: hodUserId }),
    onSuccess: () => {
      toast.success("Head of department updated");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteDepartment(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`Deleted ${ids.length} department(s)`);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Departments" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All departments</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} className="w-48" />
            <AddToggleButton label="Add department" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
          </div>
        </CardHeader>

        <InlineAddPanel open={addOpen}>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="dept-code">Code</Label>
              <Input id="dept-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Adding..." : "Add department"}
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
          <table className="w-full min-w-100 text-left text-[13px]">
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
                <th className="px-3 py-2.5 text-[11px] font-bold tracking-wider text-brand-700 uppercase">Head of Department</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {total === 0 && <EmptyTableRow colSpan={5} title="No departments yet" subtitle="Add your first department above." />}
              {pageItems.map((d) => (
                <tr
                  key={d.id}
                  className={cn(
                    "group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50",
                    selected.has(d.id) && "bg-brand-50",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${d.name}`}
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelectOne(d.id)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap text-ink">
                    <span className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-brand-600" />
                      {d.code}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink">{d.name}</td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={d.hod_user_id ?? ""}
                      onChange={(e) => setHodMutation.mutate({ id: d.id, hodUserId: e.target.value || null })}
                      className="w-44"
                      disabled={setHodMutation.isPending}
                    >
                      <option value="">— None —</option>
                      {hodsQuery.data?.items.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.full_name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button variant="outline" size="sm" className={CHAMFER} onClick={() => setPendingDelete({ id: d.id, name: d.name })}>
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
          message={`Delete department "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          message={`Delete ${selected.size} selected department(s)? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate([...selected])}
        />
      )}
    </div>
  );
}
