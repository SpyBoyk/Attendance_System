import type { ReactNode } from "react";

import { Navigate } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
