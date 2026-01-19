import { lazy, Suspense } from "react";
import { Box, Typography } from "@mui/material";
import DotLoader from "../components/global/DotLoader";
import { getColors } from "../design-system/tokens";
import { useTheme } from "../contexts/ThemeContext";

// Lazy load dashboard components
const AdminDashboard = lazy(() => import("./Dashboard/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./Dashboard/EmployeeDashboard"));

const getUserRole = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return "employee";
  try {
    const userData = JSON.parse(storedUser);
    const isAdmin =
      userData.is_staff ||
      userData.is_admin ||
      userData.is_superuser ||
      userData.role === 0 ||
      userData.role === "0";
    return isAdmin ? "admin" : "employee";
  } catch (err) {
    console.error(
      "Unable to parse stored user while determining dashboard:",
      err
    );
    return "employee";
  }
};

export default function DashboardPage() {
  const role = getUserRole();
  const theme = useTheme();
  const mode = theme?.mode ?? theme?.palette?.mode ?? "light";
  const colors = getColors(mode);
  
  const overlayBg =
    mode === "dark" ? "rgba(5, 9, 20, 0.85)" : "rgba(255, 255, 255, 0.85)";
  const overlayTextColor =
    mode === "dark" ? colors.grey[100] : colors.grey[900];

  const DashboardFallback = (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        bgcolor: overlayBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <DotLoader size={56} color={colors.blueAccent[500]} />
      <Typography sx={{ color: overlayTextColor }}>
        Loading dashboard…
      </Typography>
    </Box>
  );

  return (
    <Suspense fallback={DashboardFallback}>
      {role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />}
    </Suspense>
  );
}
