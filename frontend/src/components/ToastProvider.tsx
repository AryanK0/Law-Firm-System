import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_CONFIG: Record<ToastType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)" },
  error:   { icon: XCircle,      color: "#f43f5e", bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.25)"  },
  warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  info:    { icon: Info,          color: "#38bdf8", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.25)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const success = useCallback((title: string, msg?: string) => toast("success", title, msg), [toast]);
  const error   = useCallback((title: string, msg?: string) => toast("error",   title, msg), [toast]);
  const warning = useCallback((title: string, msg?: string) => toast("warning", title, msg), [toast]);
  const info    = useCallback((title: string, msg?: string) => toast("info",    title, msg), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5"
        style={{ pointerEvents: toasts.length ? "auto" : "none" }}
      >
        {toasts.map((t) => {
          const cfg = TOAST_CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-xl px-4 py-3.5 min-w-[280px] max-w-[360px]"
              style={{
                background: "rgba(2,8,16,0.96)",
                border: `1px solid ${cfg.border}`,
                backdropFilter: "blur(24px)",
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${cfg.border}`,
                animation: "toastIn 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon size={16} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: cfg.color }}>{t.title}</p>
                {t.message && (
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors ml-1"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
