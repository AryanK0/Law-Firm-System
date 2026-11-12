import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Briefcase, Users, FileText, Scale, Shield, Ticket, Settings,
  Command, CornerDownLeft, Zap,
} from "lucide-react";

export type CommandAction = {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  accent?: string;
  action: () => void;
  keywords?: string[];
  group: string;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  extraActions?: CommandAction[];
}

const NAV_ACTIONS = (navigate: ReturnType<typeof useNavigate>): CommandAction[] => [
  { id: "nav-dashboard",  label: "Go to Dashboard",     description: "Firm overview and analytics",          icon: Zap,       accent: "var(--color-accent)",     action: () => navigate("/dashboard"),      keywords: ["home","main"],                 group: "Navigate" },
  { id: "nav-cases",      label: "Open Cases",          description: "Browse active and closed matters",     icon: Briefcase, accent: "var(--color-accent-hi)",  action: () => navigate("/cases"),          keywords: ["matters","legal"],             group: "Navigate" },
  { id: "nav-clients",    label: "Open Clients",        description: "Client relationship management",       icon: Users,     accent: "var(--color-accent)",     action: () => navigate("/clients"),        keywords: ["contacts","crm"],              group: "Navigate" },
  { id: "nav-trust",      label: "Trust & IOLTA",       description: "Trust accounting and ledgers",         icon: Shield,    accent: "var(--color-success)",    action: () => navigate("/trust"),          keywords: ["finance","iolta","accounting"], group: "Navigate" },
  { id: "nav-conflicts",  label: "Conflict Check",      description: "Check for adverse party conflicts",    icon: Scale,     accent: "var(--color-accent-hi)",  action: () => navigate("/conflicts"),      keywords: ["adverse","check"],             group: "Navigate" },
  { id: "nav-documents",  label: "Documents",           description: "Upload and manage legal documents",    icon: FileText,  accent: "var(--color-accent-2)",   action: () => navigate("/documents"),      keywords: ["files","upload","docs"],       group: "Navigate" },
  { id: "nav-tickets",    label: "Support Tickets",     description: "Internal IT and operations queue",     icon: Ticket,    accent: "var(--color-error)",      action: () => navigate("/tickets"),        keywords: ["support","help","it"],         group: "Navigate" },
  { id: "nav-access",     label: "Access Control",      description: "Role-based permissions and hierarchy", icon: Settings,  accent: "var(--color-accent)",     action: () => navigate("/access-control"), keywords: ["roles","permissions","rbac"],  group: "Navigate" },
];

function matchScore(action: CommandAction, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const label = action.label.toLowerCase();
  const desc  = (action.description ?? "").toLowerCase();
  const keys  = (action.keywords ?? []).join(" ").toLowerCase();

  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (desc.includes(q) || keys.includes(q)) return 1;
  return 0;
}

export function CommandPalette({ open, onClose, extraActions = [] }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allActions = [...NAV_ACTIONS(navigate), ...extraActions];
  const filtered = allActions
    .map((a) => ({ action: a, score: matchScore(a, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ action }) => action);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const execute = useCallback((action: CommandAction) => {
    action.action();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) { execute(filtered[selected]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, execute, onClose]);

  if (!open) return null;

  const groups: Record<string, CommandAction[]> = {};
  for (const a of filtered) {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  }

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[16vh] bg-black/70"
      onClick={onClose}
    >
      <div
        className="glass-heavy w-full max-w-[560px] mx-4 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-rule">
          <Search size={18} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Search actions, pages, clients"
            placeholder="Search actions, pages, clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-ink placeholder:text-ink-muted text-sm focus-visible:outline-none"
          />
          <div className="flex items-center gap-1.5 text-ink-muted">
            <kbd className="text-xs bg-paper-2 border border-rule rounded px-1.5 py-0.5">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink-muted">No results for “{query}”</p>
              <p className="text-xs text-ink-muted mt-1">Try searching for a page, case, or action</p>
            </div>
          ) : (
            Object.entries(groups).map(([group, actions]) => (
              <div key={group}>
                <p className="text-xs font-medium text-ink-muted px-5 pt-3 pb-1.5">
                  {group}
                </p>
                {actions.map((action) => {
                  const idx = globalIndex++;
                  const isSelected = idx === selected;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => execute(action)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-left transition-colors duration-150 border-l-2 ${
                        isSelected ? "bg-paper-2" : "bg-transparent border-transparent"
                      }`}
                      style={{
                        borderLeftColor: isSelected ? (action.accent ?? "var(--color-accent)") : "transparent",
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-paper-2 border border-rule">
                        <Icon size={15} style={{ color: action.accent ?? "var(--color-accent)" }} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink leading-none">{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-ink-muted mt-0.5 truncate">{action.description}</p>
                        )}
                      </div>
                      {isSelected && (
                        <CornerDownLeft size={13} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-rule bg-paper-2">
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-paper border border-rule rounded px-1 py-0.5">↑</kbd>
              <kbd className="bg-paper border border-rule rounded px-1 py-0.5">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-paper border border-rule rounded px-1 py-0.5">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Command size={11} aria-hidden="true" />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
