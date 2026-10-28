import { useState, useRef, useEffect } from "react";
import {
  BriefcaseBusiness, ChevronDown, LogOut, Command, Search, Menu, X,
  LayoutDashboard, Briefcase, Users, Scale, ShieldCheck, FileText,
  Ticket, Settings, Database, Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Role, User as UserType } from "../types/user";

export type AppPage =
  | "dashboard" | "cases" | "clients" | "documents" | "tickets"
  | "trust" | "conflicts" | "access" | "dbms" | "ai-search";

interface NavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  user: UserType;
  users: UserType[];
  setRole: (role: Role) => void;
  selectUser?: (userId: number) => void;
  onOpenCommand?: () => void;
}

export const pageRoutes: Record<AppPage, string> = {
  dashboard:   "/dashboard",
  cases:       "/cases",
  clients:     "/clients",
  documents:   "/documents",
  tickets:     "/tickets",
  trust:       "/trust",
  conflicts:   "/conflicts",
  access:      "/access-control",
  dbms:        "/dbms",
  "ai-search": "/ai-search",
};

const navItems: Array<{ label: string; page: AppPage; icon: React.ElementType }> = [
  { label: "Dashboard",      page: "dashboard",  icon: LayoutDashboard },
  { label: "Cases",          page: "cases",      icon: Briefcase       },
  { label: "Clients",        page: "clients",    icon: Users           },
  { label: "Trust & IOLTA",  page: "trust",      icon: ShieldCheck     },
  { label: "Conflicts",      page: "conflicts",  icon: Scale           },
  { label: "Documents",      page: "documents",  icon: FileText        },
  { label: "Tickets",        page: "tickets",    icon: Ticket          },
  { label: "Access Control", page: "access",     icon: Settings        },
  { label: "AI Search",      page: "ai-search",  icon: Sparkles        },
];

function canViewSystems(user: UserType) {
  return user.id === 8 && user.name === "Benjamin" && user.role === "IT Admin";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  "Managing Partner": "#f59e0b",
  Partner:            "#3b82f6",
  "Senior Associate": "#0ea5e9",
  Associate:          "#06b6d4",
  Paralegal:          "#10b981",
  Intern:             "#94a3b8",
  "IT Admin":         "#f43f5e",
  "Finance Admin":    "#22d3ee",
};

export function Navbar({ activePage, onNavigate, user, users, setRole, selectUser, onOpenCommand }: NavbarProps) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const visibleNavItems = navItems.filter(
    (item) => item.page !== "dbms" || canViewSystems(user),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [activePage]);

  const roleColor = ROLE_COLORS[user.role] ?? "#3b82f6";

  return (
    <>
      <nav className="navbar-glass sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 sm:px-6 py-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                boxShadow: "0 0 14px rgba(37,99,235,0.35)",
              }}
            >
              <BriefcaseBusiness size={15} className="text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold tracking-tight text-white leading-none">PSL</div>
              <div className="text-[9px] text-slate-500 font-mono">Legal Cloud</div>
            </div>
          </button>

          {/* Nav links — desktop */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar justify-center px-2">
            {visibleNavItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className="relative flex-shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200"
                  style={{
                    color: isActive ? "#fff" : "#64748b",
                    background: isActive
                      ? "linear-gradient(135deg,rgba(37,99,235,0.22),rgba(14,165,233,0.14))"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(56,189,248,0.24)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = "#64748b";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-px rounded-full"
                      style={{ background: "linear-gradient(90deg,transparent,rgba(56,189,248,0.75),transparent)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side: Cmd search + profile + mobile hamburger */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* ⌘K button */}
            <button
              type="button"
              onClick={onOpenCommand}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              title="Open command palette (Ctrl+K)"
            >
              <Search size={12} />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline text-[10px] font-mono opacity-50 ml-0.5">⌘K</kbd>
            </button>

            {/* Profile dropdown */}
            <div ref={dropRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: profileOpen ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.04)",
                  border: profileOpen ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(56,189,248,0.08)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${roleColor}88,${roleColor}44)`, border: `1px solid ${roleColor}55` }}
                >
                  {getInitials(user.name)}
                </div>
                <div className="text-left hidden xl:block">
                  <div className="text-[11px] font-semibold text-white leading-none">{user.name.split(" ")[0]}</div>
                  <div className="text-[9px] mt-0.5 font-mono" style={{ color: roleColor }}>{user.role.split(" ")[0]}</div>
                </div>
                <ChevronDown
                  size={12}
                  className="text-slate-500 transition-transform duration-200"
                  style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0)" }}
                />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden z-50"
                  style={{
                    background: "rgba(2,8,16,0.97)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(56,189,248,0.10)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(37,99,235,0.10)",
                  }}
                >
                  {/* Header */}
                  <div className="px-4 py-3.5 border-b" style={{ borderColor: "rgba(56,189,248,0.08)", background: "rgba(37,99,235,0.05)" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg,${roleColor}99,${roleColor}55)`, border: `1px solid ${roleColor}66` }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: roleColor }}>{user.role}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{user.practice}</div>
                      </div>
                    </div>
                  </div>

                  {/* Switch user */}
                  <div className="px-2 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 px-2 mb-1.5">Switch Workspace</p>
                    <div className="space-y-0.5 max-h-44 overflow-y-auto">
                      {users.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => {
                            if (selectUser) selectUser(candidate.id);
                            else setRole(candidate.role);
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all duration-150"
                          style={{
                            background: candidate.id === user.id ? "rgba(37,99,235,0.12)" : "transparent",
                            border: candidate.id === user.id ? "1px solid rgba(56,189,248,0.18)" : "1px solid transparent",
                          }}
                          onMouseEnter={(e) => { if (candidate.id !== user.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={(e) => { if (candidate.id !== user.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: `${ROLE_COLORS[candidate.role] ?? "#3b82f6"}55` }}
                            >
                              {getInitials(candidate.name)}
                            </div>
                            <span className="font-medium text-slate-200">{candidate.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{candidate.role.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate("/"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all duration-150 font-medium"
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-72 overflow-y-auto flex flex-col"
            style={{
              background: "rgba(2,8,16,0.98)",
              backdropFilter: "blur(24px)",
              borderRight: "1px solid rgba(56,189,248,0.10)",
              boxShadow: "8px 0 40px rgba(0,0,0,0.6)",
              animation: "slideInLeft 0.24s cubic-bezier(0.34,1.2,0.64,1) forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(56,189,248,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)" }}
                >
                  <BriefcaseBusiness size={15} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">PSL Enterprise</span>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Mobile nav items */}
            <div className="flex-1 px-3 py-4 space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = activePage === item.page;
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => { onNavigate(item.page); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                    style={{
                      background: isActive ? "rgba(37,99,235,0.15)" : "transparent",
                      border: isActive ? "1px solid rgba(56,189,248,0.2)" : "1px solid transparent",
                      color: isActive ? "#fff" : "#64748b",
                    }}
                  >
                    <Icon size={16} style={{ color: isActive ? "#38bdf8" : "#64748b" }} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile search */}
            <div className="px-4 pb-6">
              <button
                type="button"
                onClick={() => { if (onOpenCommand) onOpenCommand(); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-slate-500 transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Search size={14} />
                <span>Search actions…</span>
                <kbd className="ml-auto text-[10px] font-mono opacity-40">⌘K</kbd>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
