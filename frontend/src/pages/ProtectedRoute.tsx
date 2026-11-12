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
      <div
        className="card-premium p-8 border"
        style={{
          borderColor: "color-mix(in oklab, var(--color-error) 28%, transparent)",
          backgroundColor: "color-mix(in oklab, var(--color-error) 8%, var(--color-paper-2))",
        }}
      >
        <h2 className="text-2xl font-medium text-ink mb-2">Permission Denied</h2>
        <p className="text-sm text-ink-2 max-w-xl">
          Your current role (<strong className="text-ink">{user.role}</strong>) does not have permission to access this section.
          Contact your system administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
