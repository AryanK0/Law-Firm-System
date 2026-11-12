import { useState, useRef, useEffect } from "react";
import {
  BriefcaseBusiness, ChevronDown, LogOut, Search, Menu, X,
  LayoutDashboard, Briefcase, Users, Scale, ShieldCheck, FileText,
  Ticket, Settings, Sparkles,
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
  "Managing Partner": "var(--color-role-managing)",
  Partner:            "var(--color-role-partner)",
  "Senior Associate": "var(--color-role-senior)",
  Associate:          "var(--color-role-associate)",
  Paralegal:          "var(--color-role-paralegal)",
  Intern:             "var(--color-muted)",
  "IT Admin":         "var(--color-role-admin)",
  "Finance Admin":    "var(--color-accent-hi)",
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

  useEffect(() => { setMobileOpen(false); }, [activePage]);

  const roleColor = ROLE_COLORS[user.role] ?? "var(--color-accent)";

  return (
    <>
      <nav className="navbar-glass sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 sm:px-6 py-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2.5 group flex-shrink-0"
            aria-label="Go to workspace dashboard"
          >
            <div className="icon-accent w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <BriefcaseBusiness size={15} aria-hidden="true" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-ink leading-none">PSL</div>
              <div className="text-xs text-ink-muted mt-0.5">Legal Cloud</div>
            </div>
          </button>

          {/* Nav links — desktop */}
          <div className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar justify-center px-2">
            {visibleNavItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className={`relative flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 whitespace-nowrap ${
                    isActive
                      ? "bg-paper-3 text-ink border border-rule"
                      : "text-ink-muted hover:text-ink hover:bg-paper-2 border border-transparent"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                      style={{ backgroundColor: "var(--color-accent)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side: Cmd search + profile + mobile hamburger */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button
              type="button"
              onClick={onOpenCommand}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink-muted hover:text-ink bg-paper-2 border border-rule transition-colors duration-150"
              title="Open command palette (Ctrl+K)"
            >
              <Search size={12} aria-hidden="true" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:inline text-xs opacity-60 ml-0.5">⌘K</kbd>
            </button>

            <div ref={dropRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors duration-150 ${
                  profileOpen
                    ? "bg-paper-3 border-accent/40"
                    : "bg-paper-2 border-rule hover:border-accent/30"
                }`}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-ink flex-shrink-0 border"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-accent) 18%, var(--color-paper))",
                    borderColor: roleColor,
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <div className="text-left hidden xl:block">
                  <div className="text-xs font-medium text-ink leading-none">{user.name.split(" ")[0]}</div>
                  <div className="text-xs mt-0.5" style={{ color: roleColor }}>{user.role.split(" ")[0]}</div>
                </div>
                <ChevronDown
                  size={12}
                  className="text-ink-muted transition-transform duration-200"
                  style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0)" }}
                  aria-hidden="true"
                />
              </button>

              {profileOpen && (
                <div className="glass-heavy absolute right-0 top-full mt-2 w-64 overflow-hidden z-50 shadow-xl">
                  <div className="px-4 py-3.5 border-b border-rule bg-paper-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold text-ink border"
                        style={{
                          backgroundColor: "color-mix(in oklab, var(--color-accent) 18%, var(--color-paper))",
                          borderColor: roleColor,
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{user.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: roleColor }}>{user.role}</div>
                        <div className="text-xs text-ink-muted mt-0.5">{user.practice}</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-2 border-b border-rule">
                    <p className="text-xs font-medium text-ink-muted px-2 mb-1.5">Switch workspace</p>
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {users.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => {
                            if (selectUser) selectUser(candidate.id);
                            else setRole(candidate.role);
                            setProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors duration-150 border ${
                            candidate.id === user.id
                              ? "bg-paper-3 border-accent/35 text-ink"
                              : "border-transparent text-ink-2 hover:bg-paper-2"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold text-ink"
                              style={{ backgroundColor: "var(--color-paper-3)" }}
                            >
                              {getInitials(candidate.name)}
                            </div>
                            <span className="font-medium">{candidate.name}</span>
                          </div>
                          <span className="text-xs text-ink-muted">{candidate.role.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate("/"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors duration-150 font-medium"
                    >
                      <LogOut size={13} aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-ink-muted hover:text-ink bg-paper-2 border border-rule transition-colors duration-150"
            >
              {mobileOpen ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/60"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="glass-heavy absolute inset-y-0 left-0 w-72 overflow-y-auto flex flex-col rounded-none border-r border-rule"
            style={{ animation: "slideInLeft 0.24s var(--ease-out) forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
              <div className="flex items-center gap-2.5">
                <div className="icon-accent w-8 h-8 flex items-center justify-center">
                  <BriefcaseBusiness size={15} aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-ink">PSL Legal Cloud</span>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-ink-muted hover:text-ink">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-3 py-4 space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = activePage === item.page;
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => { onNavigate(item.page); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 border ${
                      isActive
                        ? "bg-paper-3 border-accent/35 text-ink"
                        : "border-transparent text-ink-muted hover:text-ink hover:bg-paper-2"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-4 pb-6">
              <button
                type="button"
                onClick={() => { if (onOpenCommand) onOpenCommand(); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-ink-muted bg-paper-2 border border-rule hover:text-ink transition-colors duration-150"
              >
                <Search size={14} aria-hidden="true" />
                <span>Search actions…</span>
                <kbd className="ml-auto text-xs opacity-60">⌘K</kbd>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
