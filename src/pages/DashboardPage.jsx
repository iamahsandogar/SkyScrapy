import AdminDashboard from "./Dashboard/AdminDashboard";
import EmployeeDashboard from "./Dashboard/EmployeeDashboard";

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
  return role === "admin" ? <AdminDashboard /> : <EmployeeDashboard />;
}
