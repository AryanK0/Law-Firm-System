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

function getActivePage(pathname: string): AppPage {
  if (pathname.startsWith("/cases")) {
    return "cases";
  }

  if (pathname.startsWith("/clients")) {
    return "clients";
  }

  if (pathname.startsWith("/documents")) {
    return "documents";
  }

  if (pathname.startsWith("/tickets")) {
    return "tickets";
  }

  return "dashboard";
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, users, setRole } = useAuth();
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
            <Route path="/documents" element={<Documents />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
