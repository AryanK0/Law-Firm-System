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
      <div className="app-panel-solid border-rose-900/10 bg-rose-50/80 p-8 text-rose-900">
        <div className="app-kicker text-rose-700">Access control</div>
        <h2 className="mt-3 font-display text-4xl leading-none text-rose-950">
          Access denied
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-800">
          {user.role} does not have permission to open this section with the
          current demo role selection.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
