import { Suspense, lazy, useMemo, useState, useEffect, useCallback } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Navbar, pageRoutes, type AppPage } from "./components/Navbar";
import { CommandPalette } from "./components/CommandPalette";
import { useAuth } from "./content/AuthContext";
import { useToast } from "./components/ToastProvider";

const LandingPage  = lazy(() => import("./pages/LandingPage"));
const LoginPage    = lazy(() => import("./pages/LoginPage"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Cases        = lazy(() => import("./pages/Cases"));
const CaseDetail   = lazy(() => import("./pages/CaseDetail"));
const Clients      = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Documents    = lazy(() => import("./content/Upload"));
const Tickets      = lazy(() => import("./pages/Tickets"));
const AccessControlDashboard = lazy(() => import("./pages/AccessControlDashboard"));
const DBMSConsole  = lazy(() => import("./pages/DBMSConsole"));
const TrustAccounting = lazy(() => import("./pages/TrustAccounting"));
const ConflictCheck   = lazy(() => import("./pages/ConflictCheck"));
const AISearch     = lazy(() => import("./pages/AISearch"));

function getActivePage(pathname: string): AppPage {
  if (pathname.startsWith("/cases"))          return "cases";
  if (pathname.startsWith("/clients"))        return "clients";
  if (pathname.startsWith("/trust"))          return "trust";
  if (pathname.startsWith("/conflicts"))      return "conflicts";
  if (pathname.startsWith("/documents"))      return "documents";
  if (pathname.startsWith("/tickets"))        return "tickets";
  if (pathname.startsWith("/dbms"))           return "dbms";
  if (pathname.startsWith("/access-control")) return "access";
  if (pathname.startsWith("/ai-search"))      return "ai-search";
  return "dashboard";
}

function canViewSystemsOversight(user: { id: number; name: string; role: string }) {
  return user.id === 8 && user.name === "Benjamin" && user.role === "IT Admin";
}

/** Pages that show the full app shell (navbar + main layout) */
const APP_PATHS = ["/dashboard", "/cases", "/clients", "/trust", "/conflicts", "/documents", "/tickets", "/access-control", "/dbms", "/ai-search"];

function isAppPath(pathname: string) {
  return APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
          style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.3),rgba(14,165,233,0.2))", border: "1px solid rgba(56,189,248,0.3)" }}
        >
          <div className="w-4 h-4 rounded-full" style={{ background: "rgba(14,165,233,0.7)" }} />
        </div>
        <p className="text-sm text-slate-500 font-mono">Loading workspace…</p>
      </div>
    </div>
  );
}

export default function App() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, users, setRole, selectUser } = useAuth();
  const { info } = useToast();
  const activePage = useMemo(() => getActivePage(location.pathname), [location.pathname]);
  const [cmdOpen, setCmdOpen] = useState(false);

  const navigateToPage = (page: AppPage) => navigate(pageRoutes[page]);
  const showShell = isAppPath(location.pathname);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Toast on persona switch
  const handleSelectUser = useCallback((userId: number) => {
    if (selectUser) {
      const target = users.find((u) => u.id === userId);
      selectUser(userId);
      if (target) {
        info(`Switched to ${target.name}`, target.role);
      }
    }
  }, [selectUser, users, info]);

  return (
    <div className="app-root">
      {/* Global Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <Suspense fallback={<PageLoader />}>
        {/* Full app shell */}
        {showShell ? (
          <>
            <Navbar
              activePage={activePage}
              onNavigate={navigateToPage}
              user={user}
              users={users}
              setRole={setRole}
              selectUser={handleSelectUser}
              onOpenCommand={() => setCmdOpen(true)}
            />
            <main
              className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 py-8"
              style={{ animation: "pageFadeIn 0.3s ease-out" }}
            >
              <Routes>
                <Route path="/dashboard"          element={<Dashboard />} />
                <Route path="/cases"              element={<Cases />} />
                <Route path="/cases/:caseId"      element={<CaseDetail />} />
                <Route path="/clients"            element={<Clients />} />
                <Route path="/clients/:clientId"  element={<ClientDetail />} />
                <Route path="/trust"              element={<TrustAccounting />} />
                <Route path="/conflicts"          element={<ConflictCheck />} />
                <Route path="/documents"          element={<Documents />} />
                <Route path="/tickets"            element={<Tickets />} />
                <Route path="/access-control"     element={<AccessControlDashboard />} />
                <Route path="/ai-search"          element={<AISearch />} />
                <Route
                  path="/dbms"
                  element={canViewSystemsOversight(user) ? <DBMSConsole /> : <Navigate to="/dashboard" replace />}
                />
              </Routes>
            </main>
            <footer
              className="relative z-10 mt-8 border-t py-5 px-6 text-xs text-slate-600"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 sm:flex-row">
                <span className="font-semibold text-slate-500">PEARSON SPECTER LITT — Enterprise Legal Cloud</span>
                <div className="flex items-center gap-3 font-mono text-[10px] text-slate-700">
                  <span>v2.5</span>
                  <span>•</span>
                  <span>Java 21 LTS</span>
                  <span>•</span>
                  <span>MySQL 8.3</span>
                  <span>•</span>
                  <button
                    type="button"
                    className="hover:text-slate-500 transition-colors"
                    onClick={() => setCmdOpen(true)}
                  >
                    ⌘K
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          /* Landing / Login — full-page routes */
          <Routes>
            <Route path="/"       element={<LandingPage />} />
            <Route path="/login"  element={<LoginPage />} />
            {/* Legacy root redirect */}
            <Route path="*"       element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Suspense>
    </div>
  );
}
