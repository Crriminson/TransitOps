import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSocketSync } from "./hooks/useSocketSync";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import VehiclesPage from "./pages/VehiclesPage";
import DriversPage from "./pages/DriversPage";
import TripsPage from "./pages/TripsPage";
import MaintenancePage from "./pages/MaintenancePage";

function App() {
  // Initialises the Socket.io connection to /ops namespace once a token is
  // available. Event listeners are added in Step 6.
  useSocketSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/vehicles"
            element={
              <Layout>
                <VehiclesPage />
              </Layout>
            }
          />
          <Route
            path="/drivers"
            element={
              <Layout>
                <DriversPage />
              </Layout>
            }
          />
          <Route
            path="/trips"
            element={
              <Layout>
                <TripsPage />
              </Layout>
            }
          />
          <Route
            path="/maintenance"
            element={
              <Layout>
                <MaintenancePage />
              </Layout>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
