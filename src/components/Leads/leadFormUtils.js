import { createElement } from "react";
import { Typography } from "@mui/material";

export const parseEmployeesPayload = (payload) => {
  if (!payload) return [];
  
  let employees = [];
  
  // Extract main employees array
  if (Array.isArray(payload)) {
    employees = payload;
  } else if (Array.isArray(payload.employees)) {
    employees = payload.employees;
  } else if (Array.isArray(payload.data)) {
    employees = payload.data;
  } else if (Array.isArray(payload.data?.employees)) {
    employees = payload.data.employees;
  }

  // If payload contains managers, append them to the list
  if (payload.managers && Array.isArray(payload.managers)) {
    // Avoid duplicates by checking IDs
    const existingIds = new Set(employees.map(e => e.id));
    const newManagers = payload.managers.filter(m => !existingIds.has(m.id));
    employees = [...employees, ...newManagers];
  }

  return employees;
};

export const getEmployeeDisplayName = (employee = {}) => {
  if (!employee || typeof employee !== "object") {
    return "Unknown Employee";
  }

  const firstName = employee.firstName || employee.first_name || "";
  const lastName = employee.lastName || employee.last_name || "";
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  const fallbackNames = [
    employee.name,
    employee.fullName,
    employee.full_name,
    employee.display_name,
    employee.username,
    employee.user_name,
  ];

  for (const candidate of fallbackNames) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  const userDetails =
    employee.user_details || employee.userDetails || employee.user;
  if (userDetails && typeof userDetails === "object") {
    const udFirst = userDetails.firstName || userDetails.first_name || "";
    const udLast = userDetails.lastName || userDetails.last_name || "";
    if (udFirst || udLast) {
      return `${udFirst} ${udLast}`.trim();
    }
    const udFallback =
      userDetails.name || userDetails.fullName || userDetails.username;
    if (udFallback && typeof udFallback === "string") {
      return udFallback.trim();
    }
  }

  return "Unknown Employee";
};

export const MuiSelectPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiSelect-select": {
    padding: "7px",
    height: "auto",
  },
  "& .MuiPickersSectionList-sectionContent": {
    padding: "7px",
  },
};

export const MuiTextFieldPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiOutlinedInput-input": {
    padding: "7px",
    height: "auto",
  },
};

export const MuiDatePickerPadding = {
  "& .MuiOutlinedInput-root": {
    padding: 0,
  },
  "& .MuiPickersInputBase-sectionsContainer": {
    padding: "7px",
  },
  "& .MuiPickersSectionList-sectionContent": {
    padding: 0,
  },
};

export const RequiredLabel = ({ text }) =>
  createElement(
    Typography,
    { fontWeight: "bold", sx: { mb: 0.5 } },
    text,
    " ",
    createElement("span", { style: { color: "red" }, key: "required" }, "*")
  );

export const isValidLinkedInURL = (url) => {
  const regex =
    /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9._-]+\/?$/i;
  return regex.test(url);
};

export const filterAssignableEmployees = (allEmployees = [], currentUserId = null, allowAll = false) => {
  const activeEmployees = (allEmployees || []).filter((emp) => {
     const status = emp.status || (emp.user_details && emp.user_details.status);
     const isActive = emp.is_active !== undefined ? emp.is_active : (emp.user_details && emp.user_details.is_active);
     const isDeactivated = (status && status !== "Active") || isActive === false;
     return !isDeactivated;
  });

  if (allowAll) return activeEmployees;

  const isAdminUser = (emp) => {
    if (!emp || typeof emp !== "object") return false;
    return (
      emp.is_admin ||
      emp.is_staff ||
      emp.is_superuser ||
      emp.isAdmin ||
      emp.isStaff ||
      emp.isSuperuser ||
      emp.role === 0 ||
      emp.role === "0" ||
      emp.role === "admin" ||
      emp.role === "Admin"
    );
  };

  return activeEmployees.filter((emp) => {
    const empId = emp.id || emp.pk || emp.uuid;
    const userDetails = emp.user_details || emp.userDetails || emp.user;
    const userId =
      emp.user_id ||
      emp.userId ||
      (userDetails && typeof userDetails === "object" && (userDetails.id || userDetails.user_id || userDetails.userId));

    const isSelf = currentUserId && (String(empId) === String(currentUserId) || String(userId) === String(currentUserId));
    return isSelf || isAdminUser(emp);
  });
};
