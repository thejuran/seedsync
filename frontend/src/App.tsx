import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ContractsPage from "./pages/ContractsPage";
import PointChartsPage from "./pages/PointChartsPage";
import ReservationsPage from "./pages/ReservationsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import TripExplorerPage from "./pages/TripExplorerPage";
import ScenarioPage from "./pages/ScenarioPage";
import SettingsPage from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trip-explorer" element={<TripExplorerPage />} />
            <Route path="/scenarios" element={<ScenarioPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/point-charts" element={<PointChartsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
