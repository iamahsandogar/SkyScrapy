import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useTheme } from "../../contexts/ThemeContext";
import { getColors } from "../../design-system/tokens";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractDueDate = (reminder) => {
  if (!reminder) return null;
  const candidates = [
    reminder.due,
    reminder.due_date,
    reminder.dueDate,
    reminder.dueAt,
    reminder.due_at,
    reminder.follow_up_at,
    reminder.followUpAt,
    reminder.followupAt,
    reminder.follow_up_date,
    reminder.followUpDate,
    reminder.followup_date,
    reminder.date,
    reminder.datetime,
    reminder.reminder_date,
    reminder.scheduled_for,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = candidate instanceof Date ? candidate : new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
};

const parseLeadsPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload.leads,
    payload.data,
    payload.results,
    payload.items,
    payload.data?.leads,
    payload.data?.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return value.toString().replace(/\s+/g, " ").trim().toLowerCase();
};

const parseStatusesPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.statuses)) return payload.statuses;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.statuses)) return payload.data.statuses;
  return [];
};

const extractStatusName = (statusObj) => {
  if (!statusObj) return "";
  if (typeof statusObj === "string") return statusObj;
  if (typeof statusObj === "object" && statusObj !== null) {
    return (
      statusObj.name ||
      statusObj.status ||
      statusObj.status_name ||
      statusObj.label ||
      statusObj.title ||
      statusObj.value ||
      statusObj.key ||
      ""
    );
  }
  return "";
};

const resolveLeadStatusLabel = (lead, statuses) => {
  if (!lead) return "";
  const candidateStatus =
    lead.status ??
    lead.status_id ??
    lead.statusId ??
    lead.lead_status ??
    lead.status_obj ??
    lead.statusData ??
    null;

  if (typeof candidateStatus === "object" && candidateStatus !== null) {
    const resolved = extractStatusName(candidateStatus);
    if (resolved) return resolved;
  }

  if (candidateStatus === null || candidateStatus === undefined) return "";

  if (typeof candidateStatus === "string" && isNaN(candidateStatus)) {
    return candidateStatus;
  }

  const normalizedId =
    typeof candidateStatus === "string"
      ? parseInt(candidateStatus, 10)
      : candidateStatus;

  if (normalizedId === null || normalizedId === undefined) return "";

  const match = (statuses || []).find((statusObj) => {
    if (!statusObj || typeof statusObj !== "object") return false;
    const possibleIds = [
      statusObj.id,
      statusObj.pk,
      statusObj.uuid,
      statusObj.status_id,
      statusObj.value,
      statusObj.key,
    ];
    return possibleIds.some(
      (idCandidate) =>
        idCandidate !== undefined &&
        idCandidate !== null &&
        String(idCandidate) === String(normalizedId)
    );
  });

  if (match) {
    const resolved = extractStatusName(match);
    if (resolved) return resolved;
  }

  return String(normalizedId);
};

const getFollowUpStatusLabel = (lead) => {
  const value =
    lead.follow_up_status ?? lead.followupStatus ?? lead.followUpStatus;
  if (value === null || value === undefined || value === "") {
    return "None";
  }
  if (typeof value === "object") {
    const resolved = extractStatusName(value);
    return resolved || "None";
  }
  return value;
};

const normalizeLeads = (list = []) =>
  list
    .map((entry) => {
      const dueDate = extractDueDate(entry);
      if (!dueDate) return null;
      const status = (entry.follow_up_status || entry.followupStatus || "")
        .toString()
        .toLowerCase();
      if (status === "done" || status === "completed") {
        return null;
      }
      return {
        ...entry,
        dueDate,
        dueKey: toDateKey(dueDate),
      };
    })
    .filter((entry) => entry && entry.dueKey)
    .sort((a, b) => a.dueDate?.getTime() - b.dueDate?.getTime());

const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);

const formatSelectedDayLabel = (date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

const formatTime = (date) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "All day";

const isSameMonth = (date, compare) =>
  !!date &&
  !!compare &&
  date.getFullYear() === compare.getFullYear() &&
  date.getMonth() === compare.getMonth();

const getReminderTitle = (reminder) => {
  if (!reminder) return "Untitled Reminder";
  const nameCandidate =
    reminder.title ||
    reminder.name ||
    reminder.lead_title ||
    reminder.leadTitle ||
    reminder.full_name ||
    reminder.fullName ||
    reminder.company_name ||
    reminder.company ||
    reminder.description ||
    reminder.task ||
    reminder.note ||
    reminder.label;

  if (nameCandidate) return nameCandidate;

  const firstName = reminder.first_name || reminder.firstName;
  const lastName = reminder.last_name || reminder.lastName;
  const composed = `${firstName || ""} ${lastName || ""}`.trim();
  if (composed) return composed;

  return "Untitled Reminder";
};

export default function MonthlyRemindersCalendar({ onLoadingChange }) {
  const { mode } = useTheme();
  const colors = getColors(mode);
  const isDark = mode === "dark";
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const cached = getCachedLeadData();
        if (cached?.leads?.length) {
          const normalized = normalizeLeads(cached.leads);
          if (isMounted) {
            setReminders(normalized);
            setError("");
          }
        }

        const response = await apiRequest("/api/leads/?page_size=200");
        if (!isMounted) return;
        const leadsPayload = parseLeadsPayload(response);
        const normalized = normalizeLeads(leadsPayload);
        setReminders(normalized);
        setError("");
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load reminders calendar", err);
        setError(err.message || "Unable to load reminders");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStatuses = async () => {
      const cached = getCachedLeadData();
      if (isMounted && cached?.statuses?.length) {
        setStatuses(cached.statuses);
      }
      try {
        const response = await apiRequest("/ui/options/statuses/");
        if (!isMounted) return;
        const parsed = parseStatusesPayload(response);
        if (parsed.length > 0) {
          setStatuses(parsed);
        }
      } catch (err) {
        console.error("Failed to load statuses for calendar", err);
      }
    };

    loadStatuses();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  const remindersByDate = useMemo(() => {
    return reminders.reduce((acc, reminder) => {
      if (!reminder.dueKey) return acc;
      if (!acc[reminder.dueKey]) {
        acc[reminder.dueKey] = [];
      }
      acc[reminder.dueKey].push(reminder);
      acc[reminder.dueKey].sort(
        (a, b) => a.dueDate?.getTime() - b.dueDate?.getTime()
      );
      return acc;
    }, {});
  }, [reminders]);

  const monthCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startGap = firstDay.getDay();
    const cells = [];
    for (let i = 0; i < startGap; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [currentMonth]);

  const selectedKey = toDateKey(selectedDate);
  const monthLabel = formatMonthLabel(currentMonth);

  const handleMonthChange = (direction) => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + direction,
      1
    );
    setCurrentMonth(nextMonth);
    setSelectedDate(new Date(nextMonth));
  };

  const handleDaySelect = (day) => {
    if (!day) return;
    setSelectedDate(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    );
  };

  const selectedDayReminders = selectedKey
    ? remindersByDate[selectedKey] ?? []
    : [];

  const remindersThisMonth = useMemo(
    () =>
      reminders.filter((reminder) =>
        isSameMonth(reminder.dueDate, currentMonth)
      ),
    [reminders, currentMonth]
  );

  const upcomingRemindersThisMonth = useMemo(
    () =>
      remindersThisMonth.filter(
        (reminder) =>
          reminder.dueDate &&
          reminder.dueDate.getTime() > todayMidnight.getTime()
      ),
    [remindersThisMonth, todayMidnight]
  );

  const renderTooltip = (items) => {
    const hasFutureReminder = items.some(
      (reminder) =>
        reminder.dueDate && reminder.dueDate.getTime() > todayMidnight.getTime()
    );
    const tooltipTitle = hasFutureReminder ? "Upcoming reminders" : "Leads";

    return (
      <Stack spacing={0.5} sx={{ minWidth: 220 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {tooltipTitle}
        </Typography>
        {items.slice(0, 3).map((reminder) => {
          const statusLabel = resolveLeadStatusLabel(reminder, statuses);
          const followUpLabel = getFollowUpStatusLabel(reminder);
          const fallbackStatus =
            reminder.status || reminder.status_name || reminder.statusLabel;
          const statusText = statusLabel || fallbackStatus || "Unknown";
          const followUpText =
            followUpLabel ||
            reminder.follow_up_status ||
            reminder.followupStatus;
          return (
            <Box
              key={`tooltip-${reminder.id ?? reminder.uuid ?? reminder.dueKey}`}
            >
              <Typography variant="body2" fontWeight={600}>
                {getReminderTitle(reminder)}
              </Typography>
              <Stack spacing={0.15} mt={0.25}>
                <Typography variant="caption" color={colors.grey[400]}>
                  Time: {formatTime(reminder.dueDate)}
                  {reminder.priority ? ` • ${reminder.priority}` : ""}
                </Typography>
                <Typography variant="caption" color={colors.grey[400]}>
                  Status: {statusText}
                </Typography>
                <Typography variant="caption" color={colors.grey[400]}>
                  Follow-up status: {followUpText || "None"}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  };

  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: 300,
        maxWidth: 500,
        borderRadius: 3,
        height: "390px",
        overflowY: "auto",
        backgroundColor: mode === "dark" ? colors.primary[600] : colors.bg[100],
        p: 3,
      }}
      elevation={0}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
      >
        <Typography variant="h6" fontWeight="bold">
          Monthly reminders
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton
            size="small"
            onClick={() => handleMonthChange(-1)}
            aria-label="Previous month"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={600}>
            {monthLabel}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleMonthChange(1)}
            aria-label="Next month"
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {error ? (
        <Box mt={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <>
          <Box
            mt={3}
            display="flex"
            justifyContent="space-between"
            sx={{ fontSize: 12, fontWeight: 700, color: colors.primary[200] }}
          >
            {WEEK_DAYS.map((day) => (
              <Box
                key={day}
                textAlign="center"
                flex={1}
                sx={{
                  color: isDark ? colors.primary[100] : colors.primary[200],
                }}
              >
                {day}
              </Box>
            ))}
          </Box>

          <Box
            mt={1}
            display="grid"
            gridTemplateColumns="repeat(7, minmax(0, 1fr))"
            gap={1}
          >
            {monthCells.map((day, index) => {
              const cellDate =
                day === null
                  ? null
                  : new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      day
                    );
              const cellKey = cellDate ? toDateKey(cellDate) : null;
              const remindersForDay = cellKey
                ? remindersByDate[cellKey] ?? []
                : [];
              const hasReminders = remindersForDay.length > 0;
              const isSelected = cellKey === selectedKey;
              const boxKey = hasReminders ? undefined : `${index}-${day}`;

              const cellBody = (
                <Box
                  key={boxKey}
                  onClick={() => handleDaySelect(day)}
                  sx={{
                    minHeight: 48,
                    borderRadius: 2,
                    backgroundColor: isSelected
                      ? colors.blueAccent[500]
                      : "transparent",
                    color: isSelected
                      ? colors.primary[400]
                      : isDark
                      ? colors.primary[100]
                      : colors.grey[500],
                    opacity: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: day ? "pointer" : "default",
                    position: "relative",
                    px: 0.5,
                    py: 0.5,
                    transition: "border-color 0.2s, background-color 0.2s",
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ letterSpacing: 0.5, color: "inherit" }}
                  >
                    {day ?? ""}
                  </Typography>

                  {hasReminders && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 4,
                        right: 6,
                        bgcolor: colors.greenAccent[500],
                        color: colors.grey[100],
                        fontSize: 9,
                        px: 0.6,
                        borderRadius: 1,
                        lineHeight: 1,
                      }}
                    >
                      {remindersForDay.length}
                    </Box>
                  )}
                </Box>
              );

              if (hasReminders) {
                return (
                  <Tooltip
                    key={`${cellKey}-${index}`}
                    title={renderTooltip(remindersForDay)}
                    placement="top"
                    arrow
                    componentsProps={{
                      tooltip: {
                        sx: {
                          bgcolor: colors.grey[900],
                          color: colors.grey[100],
                          borderRadius: 2,
                          boxShadow: 6,
                        },
                      },
                    }}
                  >
                    {cellBody}
                  </Tooltip>
                );
              }

              return cellBody;
            })}
          </Box>

          <Stack spacing={1} mt={3}>
            <Typography variant="subtitle2" fontWeight={600}>
              {formatSelectedDayLabel(selectedDate)}
            </Typography>
            {selectedDayReminders.length === 0 ? (
              <Typography color={colors.grey[400]} variant="body2">
                No reminders scheduled for this day.
              </Typography>
            ) : (
              selectedDayReminders.map((reminder) => (
                <Paper
                  key={reminder.id ?? reminder.uuid ?? reminder.dueKey}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: colors.grey[50],
                  }}
                  elevation={0}
                >
                  <Stack spacing={0.25}>
                    <Typography fontWeight={600} variant="body2">
                      {getReminderTitle(reminder)}
                    </Typography>
                    <Typography variant="caption" color={colors.grey[400]}>
                      {formatTime(reminder.dueDate)} •{" "}
                      {reminder.priority || reminder.status || "Reminder"}
                    </Typography>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              Upcoming this month
            </Typography>
            {upcomingRemindersThisMonth.length === 0 ? (
              <Typography color={colors.grey[400]} variant="body2">
                No upcoming reminders booked for this month yet.
              </Typography>
            ) : (
              upcomingRemindersThisMonth.slice(0, 4).map((reminder) => (
                <Paper
                  key={`month-${
                    reminder.id ?? reminder.uuid ?? reminder.dueKey
                  }`}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: colors.grey[50],
                  }}
                  elevation={0}
                >
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography fontWeight={600} variant="body2">
                        {getReminderTitle(reminder)}
                      </Typography>
                      <Typography variant="caption" color={colors.grey[400]}>
                        {formatSelectedDayLabel(reminder.dueDate)} •{" "}
                        {formatTime(reminder.dueDate)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        bgcolor: colors.blueAccent[500],
                        px: 1,
                        borderRadius: 1,
                        color: colors.primary[100],
                        fontSize: 12,
                        fontWeight: 600,
                        alignSelf: "center",
                      }}
                    >
                      {(
                        resolveLeadStatusLabel(reminder, statuses) ||
                        reminder.status_name ||
                        reminder.statusLabel ||
                        reminder.status ||
                        "Rem"
                      )}
                    </Box>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}
