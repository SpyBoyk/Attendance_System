import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/components/AppLayout";
import { RequireRole } from "@/components/RequireRole";
import { DashboardPage } from "@/features/admin/DashboardPage";
import { CoursesPage } from "@/features/academics/CoursesPage";
import { DepartmentsPage } from "@/features/academics/DepartmentsPage";
import { SectionsPage } from "@/features/academics/SectionsPage";
import { TimetablePage } from "@/features/academics/TimetablePage";
import { LoginPage } from "@/features/auth/LoginPage";
import { HistoryPage } from "@/features/attendance/HistoryPage";
import { MyAttendancePage } from "@/features/attendance/MyAttendancePage";
import { SessionPage } from "@/features/attendance/SessionPage";
import { StaffAttendancePage } from "@/features/attendance/StaffAttendancePage";
import { StudentAttendancePage } from "@/features/attendance/StudentAttendancePage";
import { TodayClassesPage } from "@/features/attendance/TodayClassesPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { UsersPage } from "@/features/users/UsersPage";
import { useAuth } from "@/hooks/useAuth";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "TEACHER" || user.role === "HOD") return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireRole roles={["ADMIN"]}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="sections" element={<SectionsPage />} />
        <Route path="timetable" element={<TimetablePage />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <RequireRole roles={["TEACHER", "HOD"]}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route index element={<TodayClassesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="sessions/:sessionId" element={<SessionPage />} />
        <Route path="attendance" element={<StaffAttendancePage />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireRole roles={["STUDENT"]}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route index element={<MyAttendancePage />} />
      </Route>

      <Route
        path="/reports"
        element={
          <RequireRole roles={["ADMIN", "HOD"]}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route index element={<ReportsPage />} />
      </Route>

      <Route
        path="/students"
        element={
          <RequireRole roles={["ADMIN", "HOD", "TEACHER"]}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path=":studentId/attendance" element={<StudentAttendancePage />} />
      </Route>

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
