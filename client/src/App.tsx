import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSocketSync } from "./hooks/useSocketSync";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import DriversPage from "./pages/DriversPage";
import TripsPage from "./pages/TripsPage";
import MaintenancePage from "./pages/MaintenancePage";
import FuelExpensesPage from "./pages/FuelExpensesPage";

const withLayout = (node: ReactNode) => <Layout>{node}</Layout>;

function App() {
  // Initialises the Socket.io connection to /ops namespace once a token is
  // available. All trip/maintenance/cost events are wired in useSocketSync.
  useSocketSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Dashboard is the landing page; /dashboard is its sidebar alias */}
          <Route path="/" element={withLayout(<DashboardPage />)} />
          <Route path="/dashboard" element={withLayout(<DashboardPage />)} />
          <Route path="/vehicles" element={withLayout(<VehiclesPage />)} />
          <Route path="/drivers" element={withLayout(<DriversPage />)} />
          <Route path="/trips" element={withLayout(<TripsPage />)} />
          <Route path="/maintenance" element={withLayout(<MaintenancePage />)} />
          <Route path="/fuel-expenses" element={withLayout(<FuelExpensesPage />)} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
