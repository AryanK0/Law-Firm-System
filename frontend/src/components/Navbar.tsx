import { BriefcaseBusiness, ChevronDown } from "lucide-react";

import type { Role, User } from "../types/user";

export type AppPage = "dashboard" | "cases" | "clients" | "documents" | "tickets" | "access" | "dbms";

interface NavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  user: User;
  users: User[];
  setRole: (role: Role) => void;
}

export const pageRoutes: Record<AppPage, string> = {
  dashboard: "/",
  cases: "/cases",
  clients: "/clients",
  documents: "/documents",
  tickets: "/tickets",
  access: "/access-control",
  dbms: "/dbms",
};

const navItems: Array<{ label: string; page: AppPage }> = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Cases", page: "cases" },
  { label: "Clients", page: "clients" },
  { label: "Documents", page: "documents" },
  { label: "Tickets", page: "tickets" },
  { label: "Access Control", page: "access" },
  { label: "Systems Oversight", page: "dbms" },
];

function canViewSystemsOversight(user: User) {
  return user.id === 8 && user.name === "Benjamin" && user.role === "IT Admin";
}

export function Navbar({
  activePage,
  onNavigate,
  user,
  users,
  setRole,
}: NavbarProps) {
  const visibleNavItems = navItems.filter(
    (item) => item.page !== "dbms" || canViewSystemsOversight(user),
  );

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: "rgba(11, 17, 32, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-3 text-left"
        >
          <span className="icon-accent rounded-lg p-2">
            <BriefcaseBusiness size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            PSL Law
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-3 lg:gap-4 xl:flex-1 xl:justify-center">
          {visibleNavItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              className={`nav-pill relative px-4 py-2.5 text-sm font-medium smooth-transition ${
                activePage === item.page
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {activePage === item.page ? (
                <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="nav-pill relative min-w-[220px] px-4 py-3">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Workspace Role
          </span>
          <div className="relative">
            <select
              value={user.role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="toolbar-select w-full pr-8"
            >
              {users.map((candidate) => (
                <option
                  key={candidate.role}
                  value={candidate.role}
                  className="bg-gray-900 text-white"
                >
                  {candidate.name} | {candidate.role}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {user.name} | {user.accessLabel}
          </p>
        </div>
      </div>
    </nav>
  );
}
