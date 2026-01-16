import React, { useEffect, useState } from "react";
import { Backdrop, Box, Typography } from "@mui/material";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";

import apiRequest from "../services/api";
import DotLoader from "../global/DotLoader";
import Loading from "../global/Loading";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import { addLeadToCache, getCachedLeadData } from "../../utils/prefetchData";

const columnOrder = ["Overdue", "Due Today", "Upcoming", "Done"];

const parseStatusesPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.statuses)) return payload.statuses;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.statuses)) return payload.data.statuses;
  return [];
};

const categorizeLeads = (leads = []) => {
  const categorized = {
    Overdue: [],
    "Due Today": [],
    Upcoming: [],
    Done: [],
  };

  const todayStart = dayjs().startOf("day");

  leads.forEach((lead) => {
    const followUpAt = lead.follow_up_at || lead.followUpAt;
    if (!followUpAt) {
      return;
    }

    const followUpDate = dayjs(followUpAt);
    if (!followUpDate.isValid()) {
      return;
    }

    const followUpStatus =
      lead.follow_up_status ??
      lead.followupStatus ??
      (lead.status && lead.status.follow_up_status) ??
      "";

    if (String(followUpStatus).toLowerCase() === "done") {
      categorized.Done.push(lead);
      return;
    }

    const leadDateOnly = followUpDate.startOf("day");

    if (leadDateOnly.isBefore(todayStart)) {
      categorized.Overdue.push(lead);
    } else if (leadDateOnly.isSame(todayStart)) {
      categorized["Due Today"].push(lead);
    } else {
      categorized.Upcoming.push(lead);
    }
  });

  return categorized;
};

const filterLeadsByUser = (leadsList = []) => {
  return leadsList;
};

// Flatten the reminders payload into a single leads list
const extractLeadsFromRemindersPayload = (payload) => {
  if (!payload || typeof payload !== "object") return [];

  // Expected sections from the reminders endpoint
  const sections = ["overdue", "due_today", "upcoming", "done"];
  const collected = [];

  sections.forEach((sectionKey) => {
    const section = payload[sectionKey];
    if (!section) return;

    // Common shape: { count, leads: [...] }
    if (Array.isArray(section.leads)) {
      collected.push(...section.leads);
      return;
    }

    // Fallbacks in case API returns different keys
    if (Array.isArray(section.items)) {
      collected.push(...section.items);
      return;
    }
    if (Array.isArray(section.data)) {
      collected.push(...section.data);
    }
  });

  return collected;
};

// Parse statuses from /ui/options/statuses/ response
const parseStatusesResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.statuses)) return payload.statuses;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.statuses)) return payload.data.statuses;
  return [];
};

function KanbanBoard() {
  const [columns, setColumns] = useState(() => categorizeLeads([]));
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingDoneLeadId, setMarkingDoneLeadId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const location = useLocation();
  const { notifyError } = useNotification();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    let isMounted = true;

    // Immediately hydrate from cache (if available) to avoid empty UI while fetching
    const cachedData = getCachedLeadData();
    if (cachedData) {
      const cachedLeads = filterLeadsByUser(cachedData.leads || []);
      setLeads(cachedLeads);
      setColumns(categorizeLeads(cachedLeads));
      if (cachedData.statuses?.length) {
        setStatuses(cachedData.statuses);
      }
      setLoading(false);
    }

    const fetchReminders = async () => {
      setLoading(true);
      try {
        const [remindersPayload, statusesPayload] = await Promise.all([
          apiRequest("/api/leads/reminders/"),
          apiRequest("/ui/options/").catch((err) => {
            console.warn("Failed to fetch reminder statuses:", err);
            return null;
          }),
        ]);

        // Leads
        const leadsList = extractLeadsFromRemindersPayload(remindersPayload);

        // Statuses
        const statusesFromReminders = parseStatusesPayload(remindersPayload);
        const statusesFromOptions = parseStatusesResponse(statusesPayload);
        const mergedStatuses = statusesFromOptions?.length
          ? statusesFromOptions
          : statusesFromReminders?.length
          ? statusesFromReminders
          : [];

        if (!isMounted) return;

        const filteredLeads = filterLeadsByUser(leadsList);
        setLeads(filteredLeads);
        setColumns(categorizeLeads(filteredLeads));
        if (mergedStatuses.length) {
          setStatuses(mergedStatuses);
        }

        // Refresh cache so next visit is instant (uses addLeadToCache which is user-specific)
        try {
          const existingCache = getCachedLeadData() || {};
          const cacheData = {
            ...existingCache,
            leads: leadsList,
            statuses: mergedStatuses.length
              ? mergedStatuses
              : existingCache.statuses || [],
            timestamp: Date.now(),
          };
          // Get user-specific cache key
          const storedUser = localStorage.getItem("user");
          let cacheKey = "leadDataCache";
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              const userId = userData.id || userData.pk || userData.uuid;
              if (userId) cacheKey = `leadDataCache_${userId}`;
            } catch (e) {
              // Use default key
            }
          }
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (cacheErr) {
          console.warn("Failed to update reminders cache:", cacheErr);
        }
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReminders();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const getStatusName = (statusId) => {
    if (statusId === null || statusId === undefined || statusId === "") {
      return "None";
    }

    if (!statuses || statuses.length === 0) {
      return "Loading...";
    }

    if (typeof statusId === "string" && isNaN(statusId)) {
      return statusId;
    }

    const statusIdNum =
      typeof statusId === "string" ? parseInt(statusId, 10) : statusId;

    const statusObj = statuses.find((status) => {
      if (typeof status === "object" && status !== null) {
        const id =
          status.id ??
          status.pk ??
          status.uuid ??
          status.status_id ??
          status.value;
        if (id !== undefined && id !== null) {
          const normalizedId = Number.isNaN(Number(id)) ? id : Number(id);
          const normalizedTarget = Number.isNaN(Number(statusIdNum))
            ? statusIdNum
            : Number(statusIdNum);
          return (
            normalizedId === normalizedTarget ||
            String(normalizedId) === String(normalizedTarget)
          );
        }
      }
      return false;
    });

    if (statusObj) {
      if (typeof statusObj === "string") {
        return statusObj;
      }
      if (typeof statusObj === "object") {
        return (
          statusObj.name ||
          statusObj.status ||
          statusObj.status_name ||
          statusObj.label ||
          statusObj.title ||
          String(statusIdNum)
        );
      }
    }

    return String(statusIdNum);
  };

  const markLeadAsDoneOptimistically = async (lead) => {
    if (!lead) {
      return;
    }

    const leadId = lead.id;
    const previousLeads = leads;
    const previousColumns = columns;
    const updatedLead = {
      ...lead,
      follow_up_status: "done",
      followupStatus: "done",
    };
    const updatedLeadsList = previousLeads.map((l) =>
      l.id === leadId ? updatedLead : l
    );

    setLeads(updatedLeadsList);
    setColumns(categorizeLeads(updatedLeadsList));
    setMarkingDoneLeadId(leadId);

    try {
      await apiRequest(`/api/leads/${leadId}/follow-up-status/`, {
        method: "PATCH",
        body: JSON.stringify({ follow_up_status: "done" }),
      });

      // Keep local cache in sync so AllLeads/EmployeeAllLeads reflect instantly
      addLeadToCache(updatedLead);
    } catch (error) {
      console.error("Failed to mark lead as done:", error);
      notifyError(
        `Failed to mark lead as done: ${error?.message || "Unknown error"}`
      );
      setLeads(previousLeads);
      setColumns(previousColumns);
    } finally {
      setMarkingDoneLeadId(null);
    }
  };

  const handleMarkAsDone = (lead) => {
    markLeadAsDoneOptimistically(lead);
  };

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) {
      return;
    }

    const fromColumn = Object.keys(columns).find((col) =>
      columns[col].some((item) => item.id === active.id)
    );

    const toColumn = over.data.current?.column;

    if (!fromColumn || !toColumn || fromColumn === toColumn) {
      return;
    }

    if (fromColumn === "Done" || toColumn !== "Done") {
      return;
    }

    const movedLead = columns[fromColumn].find((lead) => lead.id === active.id);
    if (!movedLead) {
      return;
    }

    await markLeadAsDoneOptimistically(movedLead);
  };

  const activeLead = activeId
    ? [
        ...columns.Overdue,
        ...columns["Due Today"],
        ...columns.Upcoming,
        ...columns.Done,
      ].find((lead) => lead.id === activeId)
    : null;

  return (
    <>
      <Backdrop
        open={loading}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer,
          flexDirection: "column",
        }}
      >
        <DotLoader size={48} />
        <Typography mt={1} variant="body2">
          Loading reminders...
        </Typography>
      </Backdrop>
      <Backdrop
        open={Boolean(markingDoneLeadId)}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        <Loading />
        <Typography mt={1} variant="body2">
          Updating lead...
        </Typography>
      </Backdrop>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Box
          display="grid"
          gap={{ xs: 1.2, md: 2 }}
          p={{ xs: 1, md: 2 }}
          sx={{
            width: "100%",
            gridTemplateColumns: {
              xs: "repeat(1, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gridAutoRows: "minmax(0, 1fr)",
            alignItems: "stretch",
          }}
        >
          {columnOrder.map((column) => (
            <KanbanColumn
              key={column}
              title={column}
              leads={columns[column]}
              onMarkAsDone={handleMarkAsDone}
              setColumns={setColumns}
              statuses={statuses}
              getStatusName={(statusId) => getStatusName(statusId)}
            />
          ))}
        </Box>
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.23)",
          }}
        >
          {activeLead ? (
            <KanbanCard
              lead={activeLead}
              column={
                columns.Overdue.some((l) => l.id === activeLead.id)
                  ? "Overdue"
                  : columns["Due Today"].some((l) => l.id === activeLead.id)
                  ? "Due Today"
                  : columns.Upcoming.some((l) => l.id === activeLead.id)
                  ? "Upcoming"
                  : "Done"
              }
              onMarkAsDone={handleMarkAsDone}
              setColumns={setColumns}
              getStatusName={(statusId) => getStatusName(statusId)}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

export default KanbanBoard;
