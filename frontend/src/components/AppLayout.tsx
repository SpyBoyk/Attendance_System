import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarClock,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types";

interface NavItem {
  to: string;
  label: string;
  subtitle: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", subtitle: "Institution overview", icon: LayoutDashboard, roles: ["ADMIN"], group: "Overview" },
  { to: "/admin/departments", label: "Departments", subtitle: "Academic departments", icon: Building2, roles: ["ADMIN"], group: "Academics" },
  { to: "/admin/courses", label: "Courses", subtitle: "Course catalog", icon: Layers, roles: ["ADMIN"], group: "Academics" },
  { to: "/admin/sections", label: "Sections & Roster", subtitle: "Class sections", icon: GraduationCap, roles: ["ADMIN"], group: "Academics" },
  { to: "/admin/timetable", label: "Timetable", subtitle: "Weekly schedule", icon: CalendarClock, roles: ["ADMIN"], group: "Academics" },
  { to: "/admin/users", label: "Users", subtitle: "Manage accounts", icon: UsersIcon, roles: ["ADMIN"], group: "User Management" },
  { to: "/teacher", label: "Today's Classes", subtitle: "Start taking attendance", icon: CalendarClock, roles: ["TEACHER", "HOD"], group: "Classes" },
  { to: "/teacher/history", label: "History", subtitle: "Past sessions", icon: LayoutDashboard, roles: ["TEACHER", "HOD"], group: "Classes" },
  { to: "/teacher/attendance", label: "My Attendance", subtitle: "Mark your presence", icon: CalendarCheck2, roles: ["TEACHER", "HOD"], group: "Classes" },
  { to: "/reports", label: "Reports", subtitle: "Attendance statistics", icon: BarChart3, roles: ["ADMIN", "HOD"], group: "Overview" },
  { to: "/student", label: "My Attendance", subtitle: "Your records", icon: LayoutDashboard, roles: ["STUDENT"], group: "Attendance" },
];

const PAGE_META: { match: (path: string) => boolean; title: string; subtitle: string }[] = [
  { match: (p) => p === "/admin", title: "Dashboard", subtitle: "Institution overview" },
  { match: (p) => p.startsWith("/admin/users"), title: "Users", subtitle: "Manage teacher, HOD, and student accounts" },
  { match: (p) => p.startsWith("/admin/departments"), title: "Departments", subtitle: "Manage academic departments" },
  { match: (p) => p.startsWith("/admin/courses"), title: "Courses", subtitle: "Manage the course catalog" },
  { match: (p) => p.startsWith("/admin/sections"), title: "Sections & Roster", subtitle: "Manage class sections and student rosters" },
  { match: (p) => p.startsWith("/admin/timetable"), title: "Timetable", subtitle: "Weekly class schedule" },
  { match: (p) => p.startsWith("/teacher/sessions/"), title: "Live Attendance", subtitle: "Mark today's roster" },
  { match: (p) => p.startsWith("/teacher/history"), title: "History", subtitle: "Past attendance sessions" },
  { match: (p) => p.startsWith("/teacher/attendance"), title: "My Attendance", subtitle: "Check in and review your own attendance" },
  { match: (p) => p === "/teacher", title: "Today's Classes", subtitle: "Open a session to start taking attendance" },
  { match: (p) => p === "/student", title: "My Attendance", subtitle: "Your attendance record across all classes" },
  { match: (p) => p === "/reports", title: "Reports", subtitle: "Attendance statistics across the institution" },
];

function pageMeta(pathname: string) {
  return PAGE_META.find((m) => m.match(pathname)) ?? { title: "", subtitle: "" };
}

function groupItems(items: NavItem[]) {
  const groups: { group: string; items: NavItem[] }[] = [];
  for (const item of items) {
    let bucket = groups.find((g) => g.group === item.group);
    if (!bucket) {
      bucket = { group: item.group, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(item);
  }
  return groups;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const groups = groupItems(items);
  const { title, subtitle } = pageMeta(location.pathname);

  const navLinks = (onNavigate?: () => void, rail = false) => (
    <nav className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
      {groups.map((g) => (
        <div key={g.group}>
          {!rail && (
            <div className="mb-2 flex items-center gap-2 px-2">
              <span className="h-2.5 w-1 rounded-full bg-brand-600" />
              <span className="label-eyebrow">{g.group}</span>
            </div>
          )}
          <div className="space-y-1">
            {g.items.map(({ to, label, subtitle: itemSubtitle, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                title={rail ? label : undefined}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 py-2.5 text-ink [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] hover:bg-brand-50",
                    rail ? "justify-center px-0" : "px-2.5",
                    isActive && "bg-brand-100 hover:bg-brand-100",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center bg-surface shadow-sm ring-1 ring-hairline [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)]",
                        isActive && "bg-white ring-brand-200",
                      )}
                    >
                      <Icon className={cn("size-4.5 text-ink-muted", isActive && "text-brand-700")} />
                    </span>
                    {!rail && (
                      <span className="min-w-0">
                        <span className={cn("block truncate text-xs leading-tight font-semibold text-ink", isActive && "text-brand-700")}>
                          {label}
                        </span>
                        <span className={cn("block truncate text-[11px] font-medium text-ink-faint", isActive && "text-brand-600/80")}>
                          {itemSubtitle}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const sidebarFooter = (rail = false) => (
    <div className="border-t border-hairline p-3">
      <div className={cn("flex items-center gap-2 rounded-lg px-2 py-2", rail && "justify-center px-0")}>
        <Avatar name={user.full_name} />
        {!rail && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{user.full_name}</p>
            <p className="truncate text-[10px] font-medium text-ink-faint">{user.role}</p>
          </div>
        )}
      </div>
      {/* Matches the reference app's sidebar collapse control exactly: a
          chamfered (clip-path) button with a double-chevron glyph, shown
          only while expanded -- the header's pointing-hand button (below)
          is the one control that also re-expands it. */}
      {!rail && (
        <button
          onClick={() => setCollapsed(true)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 bg-surface py-1.5 text-xs font-semibold text-ink-soft shadow-sm transition-all [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] hover:bg-surface-alt hover:text-ink active:scale-[0.98]"
          title="Collapse sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
          <span>Collapse Sidebar</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-[13px]">
      {/* Top chrome bar */}
      <header className="z-10 flex items-center gap-4 border-b border-hairline bg-surface px-4 py-3 text-ink shadow-sm sm:px-6">
        <button
          aria-label="Open menu"
          onClick={() => setMobileNavOpen(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-brand-50 md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <img src="/GIT-logo-new.png" alt="Gharda Institute of Technology" className="h-10 w-auto shrink-0 sm:h-12" />

        {/* Sidebar toggle -- a pointing-hand glyph whose finger aims at the
            sidebar edge: left when open (points at it to collapse it),
            right when collapsed (points where it will reopen). */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-3 hidden h-8 w-12 shrink-0 items-center justify-center bg-brand-700 text-white shadow-sm transition-colors [clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)] hover:bg-brand-800 md:flex"
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {collapsed ? "\u{1F449}" : "\u{1F448}"}
          </span>
        </button>

        <div className="hidden min-w-0 leading-tight sm:block">
          <p className="truncate text-[13px] font-bold text-ink">{title}</p>
          <p className="truncate text-[11px] font-medium text-ink-faint">{subtitle}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />

          <span className="hidden h-9 w-px bg-hairline sm:block" />

          <Button variant="navy" size="sm" onClick={logout}>
            <LogOut className="size-3" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Mobile drawer -- absolute within this row (not fixed to the
            viewport) so it sits below the header instead of covering it. */}
        {mobileNavOpen && (
          <div className="absolute inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-60 flex-col bg-surface shadow-lg">
              <div className="flex items-center justify-end border-b border-hairline px-3 py-3">
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-2 text-ink hover:bg-brand-50"
                >
                  <X className="size-5" />
                </button>
              </div>
              {navLinks(() => setMobileNavOpen(false))}
              {sidebarFooter()}
            </div>
          </div>
        )}

        {/* Desktop sidebar -- collapses to a narrow icon rail rather than disappearing,
            so the one "Collapse/Expand Sidebar" toggle stays in the same place (the footer)
            in both states instead of jumping to a separate header icon. */}
        <aside
          className={cn(
            "sidebar-panel hidden shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div className={cn("flex min-h-0 flex-1 flex-col", collapsed ? "min-w-16" : "min-w-60")}>
            {navLinks(undefined, collapsed)}
            {sidebarFooter(collapsed)}
          </div>
        </aside>

        <main key={location.pathname} className="view-fade flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 border-t border-hairline pt-3 text-center text-[11px] text-ink-faint">
            © {new Date().getFullYear()} GIT Attendance System. All rights reserved. Designed by Pranav.
          </footer>
        </main>
      </div>
    </div>
  );
}
