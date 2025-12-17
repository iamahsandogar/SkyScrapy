// src/design-system/navigation/menu.config.js
// import { sidebarMenu } from "./sidebarMenu";

export const sidebarMenu = [
  { label: "Dashboard", icon: "Dashboard", path: "/dashboard" },

  {
    label: "Leads",
    icon: "Group",
    children: [
      { label: "All Leads", path: "/all-leads" },
      { label: "Add Lead", path: "/create-lead" },
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
        path: "/create-employee",
        icon: "PersonAdd",
      },
      { label: "Manage Employee", path: "/management/manage-employees" },
      { label: "Manage Lead Options", path: "/manage-e/mployees" },
      { label: "Projects", path: "/management/projects" },
    ],
  },
];
