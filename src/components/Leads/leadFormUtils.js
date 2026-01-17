import { createElement } from "react";
import { Typography } from "@mui/material";

export const parseEmployeesPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.employees)) return payload.employees;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.employees)) return payload.data.employees;
  return [];
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
