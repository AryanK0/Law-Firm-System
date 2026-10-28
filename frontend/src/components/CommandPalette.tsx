import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Briefcase, Users, FileText, Scale, Shield, Ticket, Settings,
  ArrowRight, Command, CornerDownLeft, ChevronRight, Zap,
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
  { id: "nav-dashboard",  label: "Go to Dashboard",     description: "Firm overview & analytics",            icon: Zap,      accent: "#38bdf8", action: () => navigate("/dashboard"),      keywords: ["home","main"],                 group: "Navigate" },
  { id: "nav-cases",      label: "Open Cases",          description: "Browse active and closed matters",     icon: Briefcase, accent: "#3b82f6", action: () => navigate("/cases"),          keywords: ["matters","legal"],             group: "Navigate" },
  { id: "nav-clients",    label: "Open Clients",        description: "Client relationship management",       icon: Users,    accent: "#0ea5e9", action: () => navigate("/clients"),        keywords: ["contacts","crm"],              group: "Navigate" },
  { id: "nav-trust",      label: "Trust & IOLTA",       description: "Trust accounting & ledgers",           icon: Shield,   accent: "#10b981", action: () => navigate("/trust"),          keywords: ["finance","iolta","accounting"], group: "Navigate" },
  { id: "nav-conflicts",  label: "Conflict Check",      description: "Check for adverse party conflicts",    icon: Scale,    accent: "#22d3ee", action: () => navigate("/conflicts"),      keywords: ["adverse","check"],             group: "Navigate" },
  { id: "nav-documents",  label: "Documents",           description: "Upload & manage legal documents",      icon: FileText, accent: "#f59e0b", action: () => navigate("/documents"),      keywords: ["files","upload","docs"],       group: "Navigate" },
  { id: "nav-tickets",    label: "Support Tickets",     description: "Internal IT & operations queue",       icon: Ticket,   accent: "#f43f5e", action: () => navigate("/tickets"),        keywords: ["support","help","it"],         group: "Navigate" },
  { id: "nav-access",     label: "Access Control",      description: "Role-based permissions & hierarchy",   icon: Settings, accent: "#6366f1", action: () => navigate("/access-control"), keywords: ["roles","permissions","rbac"],   group: "Navigate" },
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

  // Group results
  const groups: Record<string, CommandAction[]> = {};
  for (const a of filtered) {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  }

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-[16vh]"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(4,10,24,0.98)",
          border: "1px solid rgba(56,189,248,0.16)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 80px rgba(37,99,235,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(56,189,248,0.10)" }}
        >
          <Search size={18} className="text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search actions, pages, clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
          />
          <div className="flex items-center gap-1.5 text-slate-600">
            <kbd className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No results for "{query}"</p>
              <p className="text-xs text-slate-600 mt-1">Try searching for a page, case, or action</p>
            </div>
          ) : (
            Object.entries(groups).map(([group, actions]) => (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 px-5 pt-3 pb-1.5">
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
                      className="w-full flex items-center gap-3.5 px-4 py-2.5 text-left transition-all duration-100"
                      style={{
                        background: isSelected ? "rgba(37,99,235,0.12)" : "transparent",
                        borderLeft: isSelected ? `2px solid ${action.accent ?? "#3b82f6"}` : "2px solid transparent",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${action.accent ?? "#3b82f6"}18`,
                          border: `1px solid ${action.accent ?? "#3b82f6"}30`,
                        }}
                      >
                        <Icon size={15} style={{ color: action.accent ?? "#3b82f6" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-none">{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{action.description}</p>
                        )}
                      </div>
                      {isSelected && (
                        <CornerDownLeft size={13} className="text-slate-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-2.5 border-t"
          style={{ borderColor: "rgba(56,189,248,0.08)", background: "rgba(255,255,255,0.01)" }}
        >
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">↑</kbd>
              <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Command size={10} />
            <span className="font-mono">K</span>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
