import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

import { activateUser, createUser, deactivateUser, listUsers } from "@/api/users";
import { extractApiErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/cn";
import { ROLE_LABEL } from "@/lib/labels";
import { CHAMFER } from "@/lib/shapes";
import type { UserRole } from "@/types";

const ROLES: UserRole[] = ["ADMIN", "HOD", "TEACHER", "STUDENT"];

const ROLE_ICON: Record<UserRole, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  HOD: Building2,
  TEACHER: Presentation,
  STUDENT: GraduationCap,
};

type SortField = "full_name" | "email" | "role" | "is_active";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField | null;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase hover:text-brand-800",
        active ? "text-brand-800" : "text-brand-700",
      )}
    >
      {label}
      <Icon className="size-3" />
    </button>
  );
}

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", role: "STUDENT" as UserRole });
  const [pendingDeactivate, setPendingDeactivate] = useState<{ id: string; name: string } | null>(null);
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

  const usersQuery = useQuery({
    queryKey: ["users", search, roleFilter, page, pageSize],
    queryFn: () =>
      listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  });
  const sortedItems = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    if (!sortField) return items;
    const sorted = [...items].sort((a: User, b: User) => {
      const av = sortField === "is_active" ? Number(a.is_active) : a[sortField];
      const bv = sortField === "is_active" ? Number(b.is_active) : b[sortField];
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [usersQuery.data, sortField, sortDir]);

  const activeSelectableIds = sortedItems.filter((u) => u.is_active).map((u) => u.id);
  const allSelected = activeSelectableIds.length > 0 && activeSelectableIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(activeSelectableIds);
    });
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
    mutationFn: () => createUser(form),
    onSuccess: (created) => {
      toast.success(
        created.temp_password
          ? `${created.full_name} created. Temp password: ${created.temp_password}`
          : `${created.full_name} created.`,
      );
      setForm({ full_name: "", email: "", role: "STUDENT" });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => {
      toast.success("User deactivated");
      setPendingDeactivate(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const activateMutation = useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: () => {
      toast.success("User activated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      await Promise.all(userIds.map((id) => deactivateUser(id)));
    },
    onSuccess: (_, userIds) => {
      toast.success(`Deactivated ${userIds.length} user(s)`);
      setBulkConfirmOpen(false);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs items={[{ label: "Home", onClick: () => navigate("/admin") }, { label: "Users" }]} />
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              className="w-48"
            />
            <Select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | "");
                setPage(1);
              }}
              className="w-36"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
            <AddToggleButton label="Add user" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
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
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create user"}
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
                Deactivate selected
              </Button>
            </div>
          </div>
        )}

        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-150 text-left text-[13px]">
            <thead className="border-b border-hairline bg-surface-alt">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="size-3.5"
                  />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Name" field="full_name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5">
                  <SortableHeader label="Status" field="is_active" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold tracking-wider text-brand-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sortedItems.length === 0 && (
                <EmptyTableRow colSpan={6} title="No users found" subtitle="Try adjusting your search or role filter." />
              )}
              {sortedItems.map((u) => {
                const RoleIcon = ROLE_ICON[u.role];
                return (
                  <tr
                    key={u.id}
                    className={cn(
                      "group border-l-2 border-l-transparent odd:bg-surface-alt/30 transition hover:border-l-hairline-strong hover:bg-brand-50",
                      selected.has(u.id) && "bg-brand-50",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      {u.is_active && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.full_name}`}
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelectOne(u.id)}
                          className="size-3.5"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap text-ink">
                      {u.role === "STUDENT" ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/students/${u.id}/attendance`)}
                          className="flex items-center gap-2 hover:text-brand-700 hover:underline"
                        >
                          <Avatar name={u.full_name} className="size-6" />
                          {u.full_name}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Avatar name={u.full_name} className="size-6" />
                          {u.full_name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink-faint">{u.email}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink">
                      <span className="flex items-center gap-1.5">
                        <RoleIcon className="size-3.5 text-ink-faint" />
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={u.is_active ? "good" : "crit"} className="text-[13px]">
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {u.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className={CHAMFER}
                          onClick={() => setPendingDeactivate({ id: u.id, name: u.full_name })}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={CHAMFER}
                          onClick={() => activateMutation.mutate(u.id)}
                          disabled={activateMutation.isPending}
                        >
                          Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={usersQuery.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </Card>

      {pendingDeactivate && (
        <ConfirmModal
          message={`Deactivate ${pendingDeactivate.name}? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          onCancel={() => setPendingDeactivate(null)}
          onConfirm={() => deactivateMutation.mutate(pendingDeactivate.id)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmModal
          message={`Deactivate ${selected.size} selected user(s)? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => bulkDeactivateMutation.mutate([...selected])}
        />
      )}
    </div>
  );
}
