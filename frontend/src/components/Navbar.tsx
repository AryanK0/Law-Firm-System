import { BriefcaseBusiness, ChevronDown } from "lucide-react";

import type { Role, User } from "../types/user";

export type AppPage = "dashboard" | "cases" | "clients" | "documents" | "tickets" | "trust" | "conflicts" | "access" | "dbms";

interface NavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  user: User;
  users: User[];
  setRole: (role: Role) => void;
  selectUser?: (userId: number) => void;
}

export const pageRoutes: Record<AppPage, string> = {
  dashboard: "/",
  cases: "/cases",
  clients: "/clients",
  documents: "/documents",
  tickets: "/tickets",
  trust: "/trust",
  conflicts: "/conflicts",
  access: "/access-control",
  dbms: "/dbms",
};

const navItems: Array<{ label: string; page: AppPage }> = [
  { label: "Dashboard", page: "dashboard" },
  { label: "Cases", page: "cases" },
  { label: "Clients", page: "clients" },
  { label: "Trust & IOLTA", page: "trust" },
  { label: "Conflict Check", page: "conflicts" },
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
  selectUser,
}: NavbarProps) {
  const visibleNavItems = navItems.filter(
    (item) => item.page !== "dbms" || canViewSystemsOversight(user),
  );

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#1e293b",
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-3.5 xl:flex-row xl:items-center xl:justify-between">
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-3 text-left group"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-400 group-hover:border-blue-400 transition-colors">
            <BriefcaseBusiness size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white font-heading">
                PEARSON SPECTER LITT
              </span>
              <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-700/40">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">
              Enterprise Legal Console • Core Java 21 & MySQL
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 xl:flex-1 xl:justify-center">
          {visibleNavItems.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => onNavigate(item.page)}
              className={`relative px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
                activePage === item.page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-pill relative min-w-[220px] px-4 py-3">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Workspace Role
          </span>
          <div className="relative">
            <select
              value={user.id}
              onChange={(event) => {
                const selectedId = Number(event.target.value);
                if (selectUser) {
                  selectUser(selectedId);
                } else {
                  const candidate = users.find((u) => u.id === selectedId);
                  if (candidate) setRole(candidate.role);
                }
              }}
              className="toolbar-select w-full pr-8"
            >
              {users.map((candidate) => (
                <option
                  key={candidate.id}
                  value={candidate.id}
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
