import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import ForgotPassword from "./components/Login/ForgotPassword.jsx";
import ResetPassword from "./components/Login/ResetPassword.jsx";

import Dashboard from "./pages/DashboardPage.jsx";
import AllLeads from "./pages/AllLeads.jsx";
import CreateLead from "./components/Leads/CreateLead.jsx";
import CreateEmployee from "./components/Employees/CreateEmployee.jsx";
import ManageEmployees from "./components/Employees/ManageEmployees.jsx";
import KanbanBoard from "./components/Kanban/KanbanBoard.jsx";
import AllProjects from "./components/Projects/AllProjects.jsx";
import AuthGuard from "./components/Auth/AuthGuard.jsx";
import Login from "./components/Login/Login.jsx";

export default function App() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/all-leads" element={<AllLeads />} />
          <Route path="/create-lead" element={<CreateLead />} />
          <Route path="/edit-lead/:editId" element={<CreateLead />} />
          <Route path="/edit-project/:projectId" element={<CreateLead />} />
          <Route path="/create-employee" element={<CreateEmployee />} />
          <Route
            path="/management/manage-employees"
            element={<ManageEmployees />}
          />
          <Route path="/reminders" element={<KanbanBoard />} />
          <Route path="/management/projects" element={<AllProjects />} />
        </Route>
      </Route>

      {/* Catch-all: redirect any unknown path to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
