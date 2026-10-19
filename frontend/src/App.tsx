import { Suspense, lazy, useMemo } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Navbar, pageRoutes, type AppPage } from "./components/Navbar";
import { useAuth } from "./content/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Cases = lazy(() => import("./pages/Cases"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Documents = lazy(() => import("./content/Upload"));
const Tickets = lazy(() => import("./pages/Tickets"));
const AccessControlDashboard = lazy(() => import("./pages/AccessControlDashboard"));
const DBMSConsole = lazy(() => import("./pages/DBMSConsole"));
const TrustAccounting = lazy(() => import("./pages/TrustAccounting"));
const ConflictCheck = lazy(() => import("./pages/ConflictCheck"));

function getActivePage(pathname: string): AppPage {
  if (pathname.startsWith("/cases")) {
    return "cases";
  }

  if (pathname.startsWith("/clients")) {
    return "clients";
  }

  if (pathname.startsWith("/trust")) {
    return "trust";
  }

  if (pathname.startsWith("/conflicts")) {
    return "conflicts";
  }

  if (pathname.startsWith("/documents")) {
    return "documents";
  }

  if (pathname.startsWith("/tickets")) {
    return "tickets";
  }

  if (pathname.startsWith("/dbms")) {
    return "dbms";
  }

  if (pathname.startsWith("/access-control")) {
    return "access";
  }

  return "dashboard";
}

function canViewSystemsOversight(user: { id: number; name: string; role: string }) {
  return user.id === 8 && user.name === "Benjamin" && user.role === "IT Admin";
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, users, setRole, selectUser } = useAuth();
  const activePage = useMemo(() => getActivePage(location.pathname), [location.pathname]);

  const navigateToPage = (page: AppPage) => {
    navigate(pageRoutes[page]);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar
        activePage={activePage}
        onNavigate={navigateToPage}
        user={user}
        users={users}
        setRole={setRole}
        selectUser={selectUser}
      />

      <main className="mx-auto max-w-7xl px-6 py-16">
        <Suspense
          fallback={
            <div className="card-premium p-8 text-sm text-muted-foreground">
              Loading workspace...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:caseId" element={<CaseDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:clientId" element={<ClientDetail />} />
            <Route path="/trust" element={<TrustAccounting />} />
            <Route path="/conflicts" element={<ConflictCheck />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/access-control" element={<AccessControlDashboard />} />
            <Route
              path="/dbms"
              element={canViewSystemsOversight(user) ? <DBMSConsole /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0b0f19] py-6 px-6 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">PEARSON SPECTER LITT</span>
            <span className="text-slate-600">|</span>
            <span>Enterprise Legal Cloud Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Production v2.4</span>
            <span>•</span>
            <span>Java 21 LTS Core</span>
            <span>•</span>
            <span>MySQL 8.3 Live</span>
            <span>•</span>
            <span>JavaFX Desktop Client</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
