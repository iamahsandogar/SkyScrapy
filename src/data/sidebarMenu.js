export const sidebarMenu = [
  {
    label: "Dashboard",
    icon: "Dashboard",
    path: "/dashboard",
  },

  {
    label: "Leads",
    icon: "Group",
    children: [
      {
        label: "All Leads",
        icon: "ListAlt", // ✅ ADDED (was missing)
        path: "/all-leads",
      },
      {
        label: "Add Lead",
        icon: "Add", // ➕ PLUS ICON
        path: "/create-lead",
      },
    ],
  },

  {
    label: "Reminders",
    icon: "Notifications",
    path: "/reminders",
  },

  {
    label: "Management",
    icon: "ManageAccounts",
    children: [
      {
        label: "Add Employee",
        icon: "PersonAdd",
        path: "/create-employee",
      },
      {
        label: "Manage Employee",
        icon: "People",
        path: "/management/manage-employees",
      },
      {
        label: "Manage Lead Options",
        icon: "Tune",
        path: "/management/manage-lead-options",
      },
      {
        label: "Projects",
        icon: "Work",
        path: "/management/projects",
      },
    ],
  },
];
