import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {
  RequiredLabel,
  MuiSelectPadding,
  MuiTextFieldPadding,
  MuiDatePickerPadding,
  getEmployeeDisplayName,
} from "./leadFormUtils";

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const LeadFormFields = ({
  formData = {},
  employees = [],
  meta = { status: [], source: [] },
  loadingMeta = false,
  onChange = () => {},
  onAssignedToChange = () => {},
  onDateChange = () => {},
  onTimeChange = () => {},
  onLinkedInBlur = () => {},
}) => {
  const statuses = normalizeArray(meta.status);
  const sources = normalizeArray(meta.source);
  const lifecycles = normalizeArray(meta.lifecycle);
  const employeeList = normalizeArray(employees);

  const getEmployeeIdentifier = (emp) => {
    if (!emp || typeof emp !== "object") return null;
    if (emp.id) return emp.id;
    if (emp.pk) return emp.pk;
    if (emp.uuid) return emp.uuid;
    if (emp.user_id) return emp.user_id;
    if (emp.userId) return emp.userId;
    const userDetails = emp.user_details || emp.userDetails || emp.user;
    if (userDetails && typeof userDetails === "object") {
      return userDetails.id || userDetails.user_id || userDetails.userId || null;
    }
    return null;
  };

  const assignedValue = (() => {
    if (
      formData.assigned_to === undefined ||
      formData.assigned_to === null ||
      String(formData.assigned_to).trim() === ""
    ) {
      return "";
    }
    const valueStr = String(formData.assigned_to).trim();
    const found = employeeList.some((emp) => {
      const empId = getEmployeeIdentifier(emp);
      return empId !== null && String(empId).trim() === valueStr;
    });
    return found ? valueStr : "";
  })();

  const renderStatusValue = (val) => {
    if (val === undefined || val === null || val === "") {
      return "Select Status";
    }
    const matched = statuses.find((item) => {
      if (typeof item === "string") {
        return item === val;
      }
      const possibleId = item.id || item.pk || item.status_id || item.uuid || null;
      return possibleId === val;
    });
    if (!matched) {
      return "Select Status";
    }
    if (typeof matched === "string") {
      return matched;
    }
    return (
      matched.name || matched.status || matched.label || matched.title || "Select Status"
    );
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <RequiredLabel text="Title" />
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="title"
            value={formData.title}
            onChange={onChange}
          />
        </Box>
        <Box flex={1} minWidth={200}>
          <RequiredLabel text="Lead Status" />
          <TextField
            sx={MuiSelectPadding}
            select
            fullWidth
            name="status"
            value={
              formData.status === undefined || formData.status === null
                ? ""
                : formData.status
            }
            onChange={(e) => {
              const parsed =
                e.target.value === "" || e.target.value === undefined
                  ? null
                  : parseInt(e.target.value, 10);
              onChange({ target: { name: "status", value: parsed } });
            }}
            disabled={loadingMeta}
            SelectProps={{
              displayEmpty: true,
              renderValue: renderStatusValue,
            }}
          >
            {statuses.length === 0 && !loadingMeta ? (
              <MenuItem value="" disabled>
                No statuses available
              </MenuItem>
            ) : (
              statuses.map((item, index) => {
                const objectId =
                  typeof item === "object"
                    ? item.id || item.pk || item.status_id || item.uuid
                    : null;
                const statusId = objectId !== null ? objectId : index;
                const statusName =
                  typeof item === "string"
                    ? item
                    : item.name || item.status || item.label || item.title || "";
                return (
                  <MenuItem key={String(statusId)} value={statusId}>
                    {statusName || "Untitled"}
                  </MenuItem>
                );
              })
            )}
          </TextField>
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Source
          </Typography>
          <TextField
            sx={MuiSelectPadding}
            select
            fullWidth
            name="source"
            value={formData.source === undefined ? "" : formData.source}
            onChange={onChange}
            disabled={loadingMeta}
            SelectProps={{
              displayEmpty: true,
              renderValue: (val) => (val === "" || val === null ? "None" : val),
            }}
          >
            <MenuItem value="">None</MenuItem>
            {sources.length === 0 && !loadingMeta ? (
              <MenuItem value="" disabled>
                No sources available
              </MenuItem>
            ) : (
              sources.map((item, index) => {
                const value =
                  typeof item === "string" ? item : item.name || item.source || "";
                const key =
                  (typeof item === "object" &&
                    (item.id || item.pk || item.uuid || item.name)) ||
                  index;
                return (
                  <MenuItem key={String(key)} value={value}>
                    {value || "Unnamed Source"}
                  </MenuItem>
                );
              })
            )}
          </TextField>
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Lifecycle
          </Typography>
          <TextField
            sx={MuiSelectPadding}
            select
            fullWidth
            name="lifecycle"
            value={formData.lifecycle === undefined ? "" : formData.lifecycle}
            onChange={onChange}
            disabled={loadingMeta}
            SelectProps={{
              displayEmpty: true,
              renderValue: (val) => (val === "" || val === null ? "None" : val),
            }}
          >
            <MenuItem value="">None</MenuItem>
            {lifecycles.length === 0 && !loadingMeta ? (
              <MenuItem value="" disabled>
                No lifecycles available
              </MenuItem>
            ) : (
              lifecycles.map((item, index) => {
                const value =
                  typeof item === "string" ? item : item.name || item.lifecycle || "";
                const key =
                  (typeof item === "object" &&
                    (item.id || item.pk || item.uuid || item.name)) ||
                  index;
                return (
                  <MenuItem key={String(key)} value={value}>
                    {value || "Unnamed Lifecycle"}
                  </MenuItem>
                );
              })
            )}
          </TextField>
        </Box>
      </Box>

      <Box>
        <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
          Description
        </Typography>
        <TextField
          sx={MuiTextFieldPadding}
          fullWidth
          multiline
          rows={3}
          name="description"
          value={formData.description}
          onChange={onChange}
        />
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <RequiredLabel text="Assigned To" />
          <TextField
            sx={MuiSelectPadding}
            select
            fullWidth
            name="assigned_to"
            value={assignedValue}
            onChange={(e) => onAssignedToChange(e.target.value)}
            disabled={loadingMeta}
            SelectProps={{
              displayEmpty: true,
              renderValue: (val) => {
                if (!val && val !== 0) return "Select Employee";
                const valStr = String(val).trim();
                if (!valStr) return "Select Employee";
                const selectedEmp = employeeList.find((emp) => {
                  const empId = emp.id || emp.pk || emp.uuid;
                  const userDetails = emp.user_details || emp.userDetails || emp.user;
                  const empUserId =
                    emp.user_id || emp.userId ||
                    (userDetails && typeof userDetails === "object" &&
                      (userDetails.id || userDetails.user_id || userDetails.userId));
                  return (
                    (empId && String(empId).trim() === valStr) ||
                    (empUserId && String(empUserId).trim() === valStr)
                  );
                });
                if (selectedEmp) {
                  return getEmployeeDisplayName(selectedEmp);
                }
                return "Select Employee";
              },
            }}
          >
            {employeeList.map((emp) => {
              const empId = emp.id || emp.pk || emp.uuid;
              if (!empId) return null;
              return (
                <MenuItem key={empId} value={String(empId)}>
                  {getEmployeeDisplayName(emp)}
                </MenuItem>
              );
            })}
          </TextField>
        </Box>

        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Follow Up Date
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={formData.follow_up_at}
              onChange={onDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: MuiDatePickerPadding,
                },
              }}
            />
          </LocalizationProvider>
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Follow Up Time
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              value={formData.follow_up_time}
              onChange={onTimeChange}
              ampm
              timeSteps={{ minutes: 1 }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: MuiDatePickerPadding,
                },
              }}
            />
          </LocalizationProvider>
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Follow Up Status
          </Typography>
          <TextField
            sx={MuiSelectPadding}
            select
            fullWidth
            name="follow_up_status"
            value={formData.follow_up_status || ""}
            onChange={onChange}
            SelectProps={{
              displayEmpty: true,
              renderValue: (val) => (val === "" ? "None" : val),
            }}
          >
            <MenuItem value="done">done</MenuItem>
            <MenuItem value="pending">pending</MenuItem>
          </TextField>
        </Box>
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Company Name
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="company_name"
            value={formData.company_name}
            onChange={onChange}
          />
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Contact First Name
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="contact_first_name"
            value={formData.contact_first_name}
            onChange={onChange}
          />
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Contact Last Name
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="contact_last_name"
            value={formData.contact_last_name}
            onChange={onChange}
          />
        </Box>
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Contact Email
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={onChange}
          />
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Contact Phone
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="contact_phone"
            value={formData.contact_phone}
            onChange={onChange}
          />
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
            Contact Position Title
          </Typography>
          <TextField
            sx={MuiTextFieldPadding}
            fullWidth
            name="contact_position_title"
            value={formData.contact_position_title}
            onChange={onChange}
          />
        </Box>
      </Box>

      <Box>
        <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
          Contact LinkedIn URL
        </Typography>
        <TextField
          sx={MuiTextFieldPadding}
          fullWidth
          name="contact_linkedin_url"
          value={formData.contact_linkedin_url}
          onChange={onChange}
          placeholder="https://linkedin.com/in/username"
          onBlur={onLinkedInBlur}
        />
      </Box>
    </Box>
  );
};

export default LeadFormFields;
