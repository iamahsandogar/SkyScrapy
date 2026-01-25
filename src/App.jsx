import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import ForgotPassword from "./components/Login/ForgotPassword.jsx";
import ResetPassword from "./components/Login/ResetPassword.jsx";

import Dashboard from "./pages/DashboardPage.jsx";
import AllLeads from "./pages/AllLeads.jsx";
import EmployeeAllLeads from "./pages/EmployeeAllLeads.jsx";
import CreateLead from "./components/Leads/CreateLead.jsx";
import CreateEmployee from "./components/Employees/CreateEmployee.jsx";
import KanbanBoard from "./components/Kanban/KanbanBoard.jsx";
import AllProjects from "./components/Projects/AllProjects.jsx";
import AuthGuard from "./components/Auth/AuthGuard.jsx";
import Login from "./components/Login/Login.jsx";
import ManageLeadOptions from "./components/Leads/ManageLeadOptions.jsx";
import DotLoader from "./components/global/DotLoader.jsx";
import { colors } from "./design-system/tokens/index.js";
import { Box, Typography } from "@mui/material";

// Lazy load ManageEmployees
const ManageEmployees = lazy(() => import("./components/Employees/ManageEmployees.jsx"));

// Component to conditionally render AllLeads based on user role
function RoleBasedAllLeads({ adminComponent, employeeComponent }) {
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        setIsEmployee(false);
        return;
      }
      const userData = JSON.parse(storedUser);
      setIsEmployee(
        userData.role === 1 ||
          userData.role === "1" ||
          (!userData.is_staff &&
            !userData.is_admin &&
            !userData.is_superuser &&
            userData.role !== 0 &&
            userData.role !== "0")
      );
    } catch (e) {
      console.error("Error parsing user data:", e);
      setIsEmployee(false);
    }
  }, []);

  return isEmployee ? employeeComponent : adminComponent;
}

// Component to handle catch-all routes with authentication check
function CatchAllRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem("user");
      const isAuth = localStorage.getItem("isAuth") === "true";
      setIsAuthenticated(user && isAuth);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: "100vh" }}
      >
        <DotLoader size={48} color={colors.blueAccent[500]} />
      </Box>
    );
  }

  // If authenticated, redirect to dashboard; otherwise to login
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/all-leads"
            element={
              <RoleBasedAllLeads
                adminComponent={<AllLeads />}
                employeeComponent={<EmployeeAllLeads />}
              />
            }
          />
          <Route path="/create-lead" element={<CreateLead />} />
          <Route path="/edit-lead/:editId" element={<CreateLead />} />
          <Route path="/edit-project/:projectId" element={<CreateLead />} />
          <Route path="/create-employee" element={<CreateEmployee />} />
          <Route
            path="/management/manage-employees"
            element={
              <Suspense
                fallback={
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                    sx={{ minHeight: "400px" }}
                  >
                    <DotLoader size={48} color={colors.blueAccent[500]} />
                    <Typography color="text.secondary">
                      Loading employee management...
                    </Typography>
                  </Box>
                }
              >
                <ManageEmployees />
              </Suspense>
            }
          />
          <Route
            path="/management/manage-lead-options"
            element={<ManageLeadOptions />}
          />
          <Route path="/reminders" element={<KanbanBoard />} />
          <Route path="/management/projects" element={<AllProjects />} />
        </Route>
      </Route>

      {/* Catch-all: redirect based on authentication status */}
      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
}
