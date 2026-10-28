import type { ReactNode } from "react";

import { useAuth } from "../content/AuthContext";
import type { Role } from "../types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  minLevel?: number;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  minLevel,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user } = useAuth();

  const blockedByLevel =
    typeof minLevel === "number" ? user.hierarchy > minLevel : false;
  const blockedByRole =
    allowedRoles && allowedRoles.length > 0
      ? !allowedRoles.includes(user.role)
      : false;

  if (blockedByLevel || blockedByRole) {
    return (
      <div className="card-premium p-8 border" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)" }}>
        <p className="eyebrow mb-3" style={{ color: "#f87171" }}>Access Restricted</p>
        <h2 className="text-2xl font-bold text-white mb-2">Permission Denied</h2>
        <p className="text-sm text-slate-400 max-w-xl">
          Your current role (<strong className="text-white">{user.role}</strong>) does not have permission to access this section.
          Contact your system administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
