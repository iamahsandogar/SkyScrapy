import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { useLocation } from "react-router-dom";
import KanbanColumn from "./KanbanColumn";
import apiRequest from "../services/api";
import { getCachedLeadData } from "../../utils/prefetchData";
import dayjs from "dayjs";

// Helper function to get status name from status ID
const getStatusName = (statusId, statuses = []) => {
  if (statusId === null || statusId === undefined || statusId === "") {
    return "None";
  }

  if (typeof statusId === "object" && statusId !== null) {
    return statusId.name || statusId.label || "Unknown";
  }

  const status = statuses.find((s) => s.id === statusId || s.pk === statusId);
  return status ? status.name || status.label : `Status ${statusId}`;
};

const EMPTY_BOARD = {
  Overdue: [],
  "Due Today": [],
  Upcoming: [],
  Done: [],
};

function KanbanBoard() {
  const location = useLocation();
  const [columns, setColumns] = useState(EMPTY_BOARD);
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get current user info for filtering
  const getCurrentUser = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return { id: null, isAdmin: false };

    const userData = JSON.parse(storedUser);
    const userId = userData.id || userData.pk || userData.uuid;
    const isAdmin =
      userData.is_staff ||
      userData.is_admin ||
      userData.is_superuser ||
      userData.role === 0 ||
      userData.role === "0";

    return { id: userId, isAdmin };
  };

  // Filter leads based on user role
  const filterLeadsByUser = (leadsList) => {
    const { id: currentUserId, isAdmin } = getCurrentUser();

    if (isAdmin) {
      return leadsList;
    }

    // Employee sees only their own leads
    return leadsList.filter((lead) => {
      let assignedTo =
        lead.assigned_to ||
        lead.assignedTo ||
        lead.assigned_to_id ||
        lead.assignedToId;

      if (assignedTo && typeof assignedTo === "object" && assignedTo !== null) {
        if (assignedTo.user_details && assignedTo.user_details.id) {
          assignedTo = assignedTo.user_details.id;
        } else {
          assignedTo = assignedTo.id || assignedTo.pk || assignedTo.uuid || null;
        }
      }

      if (!assignedTo && assignedTo !== 0) {
        return false;
      }

      const assignedToStr = String(assignedTo).trim();
      const currentUserIdStr = String(currentUserId).trim();
      return assignedToStr === currentUserIdStr;
    });
  };

  // Categorize leads into columns based on follow_up_at and follow_up_status
  const categorizeLeads = (leadsList) => {
    const now = dayjs();
    const todayStart = now.startOf("day");

    const categorized = {
      Overdue: [],
      "Due Today": [],
      Upcoming: [],
      Done: [],
    };

    leadsList.forEach((lead) => {
      const followUpStatus =
        lead.follow_up_status || lead.followupStatus || "";

      // Leads with follow_up_status = "done" go to Done column
      if (followUpStatus.toLowerCase() === "done") {
        categorized.Done.push(lead);
        return;
      }

      // If no follow_up_at, skip categorization (or put in a default column)
      const followUpAt = lead.follow_up_at || lead.followUpAt;
      if (!followUpAt) {
        // Leads without follow-up date can go to Upcoming
        categorized.Upcoming.push(lead);
        return;
      }

      const followUpDate = dayjs(followUpAt);

      if (!followUpDate.isValid()) {
        categorized.Upcoming.push(lead);
        return;
      }

      // Compare dates (ignore time for date comparison)
      const followUpDateOnly = followUpDate.startOf("day");
      const todayStartOnly = todayStart;

      if (followUpDateOnly.isBefore(todayStartOnly)) {
        // Previous dates (before today) = Overdue
        categorized.Overdue.push(lead);
      } else if (followUpDateOnly.isSame(todayStartOnly)) {
        // Today = Due Today
        categorized["Due Today"].push(lead);
      } else {
        // Tomorrow or future dates = Upcoming
        categorized.Upcoming.push(lead);
      }
    });

    return categorized;
  };

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);

      // Try cached data first
      const cachedData = getCachedLeadData();
      if (cachedData?.leads) {
        const filteredLeads = filterLeadsByUser(cachedData.leads);
        const categorized = categorizeLeads(filteredLeads);
        setColumns(categorized);
        setLeads(filteredLeads);
        if (cachedData?.statuses) {
          setStatuses(cachedData.statuses);
        }
        setLoading(false);
        return;
      }

      // No cache, fetch from reminders API
      // This API handles role-based filtering on the backend
      // Admin gets all leads, employees get only their assigned leads
      try {
        const data = await apiRequest("/api/leads/reminders/");

        let leadsList = [];
        if (data && Array.isArray(data.leads)) {
          leadsList = data.leads;
        } else if (data && Array.isArray(data)) {
          leadsList = data;
        } else if (data?.data) {
          if (Array.isArray(data.data)) {
            leadsList = data.data;
          } else if (data.data?.leads && Array.isArray(data.data.leads)) {
            leadsList = data.data.leads;
          }
        }

        // The reminders API already filters by role on the backend:
        // - Admin gets all leads
        // - Employee gets only their assigned leads
        // So we can use the leads directly, but we'll still apply the filter
        // as a safety measure in case the API response format changes
        const filteredLeads = filterLeadsByUser(leadsList);
        const categorized = categorizeLeads(filteredLeads);
        setColumns(categorized);
        setLeads(filteredLeads);
        
        // Also get statuses from cache if available
        const cacheForStatuses = getCachedLeadData();
        if (cacheForStatuses?.statuses) {
          setStatuses(cacheForStatuses.statuses);
        }
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [location.pathname]); // Refresh when navigating to this page

  // Handle drag and drop
  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;

    const fromColumn = Object.keys(columns).find((col) =>
      columns[col].some((lead) => lead.id === active.id)
    );

    const toColumn = over.data.current?.column;

    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    // Prevent dragging from Done column
    if (fromColumn === "Done") {
      return;
    }

    const movedLead = columns[fromColumn].find((lead) => lead.id === active.id);

    // Prepare payload for API update
    let updatedFollowUpAt = movedLead.follow_up_at || movedLead.followUpAt;
    let updatedFollowUpStatus = movedLead.follow_up_status || movedLead.followupStatus || "";

    // Update follow_up_at and follow_up_status based on target column
    if (toColumn === "Done") {
      // Moving to Done: set follow_up_status to "done"
      updatedFollowUpStatus = "done";
    } else if (fromColumn === "Done") {
      // Moving from Done: clear follow_up_status
      updatedFollowUpStatus = "";
    }

    // Update follow_up_at based on target column (if not Done)
    if (toColumn !== "Done") {
      const now = dayjs();
      if (toColumn === "Due Today") {
        // Set to today
        updatedFollowUpAt = now.startOf("day").format();
      } else if (toColumn === "Upcoming") {
        // Set to tomorrow
        updatedFollowUpAt = now.add(1, "day").startOf("day").format();
      } else if (toColumn === "Overdue") {
        // Set to yesterday
        updatedFollowUpAt = now.subtract(1, "day").startOf("day").format();
      }
    }

    try {
      const leadId = movedLead.id;
      const currentPayload = {
        title: movedLead.title || "",
        status: movedLead.status || null,
        source: movedLead.source || "",
        description: movedLead.description || "",
        company_name: movedLead.company_name || "",
        contact_first_name: movedLead.contact_first_name || "",
        contact_last_name: movedLead.contact_last_name || "",
        contact_email: movedLead.contact_email || "",
        contact_phone: movedLead.contact_phone || "",
        contact_position_title: movedLead.contact_position_title || "",
        contact_linkedin_url: movedLead.contact_linkedin_url || "",
        follow_up_at: updatedFollowUpAt,
        follow_up_status: updatedFollowUpStatus,
      };

      // Include assigned_to if it exists
      let assignedToId = movedLead.assigned_to || movedLead.assignedTo || null;
      if (assignedToId && typeof assignedToId === "object" && assignedToId !== null) {
        if (assignedToId.user_details && assignedToId.user_details.id) {
          assignedToId = assignedToId.user_details.id;
        } else {
          assignedToId = assignedToId.id || assignedToId.pk || assignedToId.uuid || null;
        }
      }

      if (assignedToId) {
        currentPayload.assigned_to = assignedToId;
      }

      await apiRequest(`/api/leads/${leadId}/`, {
        method: "PUT",
        body: JSON.stringify(currentPayload),
      });

      // Update the lead in local state
      const updatedLead = {
        ...movedLead,
        follow_up_at: updatedFollowUpAt,
        followUpAt: updatedFollowUpAt,
        follow_up_status: updatedFollowUpStatus,
        followupStatus: updatedFollowUpStatus,
      };

      // Update cache
      const cachedData = getCachedLeadData();
      if (cachedData?.leads) {
        const leadIndex = cachedData.leads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          cachedData.leads[leadIndex] = { ...cachedData.leads[leadIndex], ...updatedLead };
          cachedData.timestamp = Date.now();
          localStorage.setItem("leadDataCache", JSON.stringify(cachedData));
        }
      }

      // Update leads state
      setLeads((prevLeads) => {
        const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          const newLeads = [...prevLeads];
          newLeads[leadIndex] = updatedLead;
          return newLeads;
        }
        return prevLeads;
      });

      // Update columns state by removing from source and re-categorizing
      setColumns((prev) => {
        // Remove from source column
        const newColumns = {
          ...prev,
          [fromColumn]: prev[fromColumn].filter((l) => l.id !== leadId),
        };

        // Re-categorize all leads including the updated one
        const allLeads = [
          ...newColumns.Overdue,
          ...newColumns["Due Today"],
          ...newColumns.Upcoming,
          ...newColumns.Done,
        ];
        
        // Replace the lead in the list with updated version
        const leadIndex = allLeads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          allLeads[leadIndex] = updatedLead;
        } else {
          allLeads.push(updatedLead);
        }

        // Re-categorize all leads
        return categorizeLeads(allLeads);
      });
    } catch (error) {
      console.error("Failed to update lead:", error);
      alert("Failed to update lead");
      return; // Don't update UI if API call failed
    }
  };

  // Handle Done button click
  const handleMarkAsDone = async (lead) => {
    try {
      const leadId = lead.id;
      const currentPayload = {
        title: lead.title || "",
        status: lead.status || null,
        source: lead.source || "",
        description: lead.description || "",
        company_name: lead.company_name || "",
        contact_first_name: lead.contact_first_name || "",
        contact_last_name: lead.contact_last_name || "",
        contact_email: lead.contact_email || "",
        contact_phone: lead.contact_phone || "",
        contact_position_title: lead.contact_position_title || "",
        contact_linkedin_url: lead.contact_linkedin_url || "",
        follow_up_at: lead.follow_up_at || null,
        follow_up_status: "done",
      };

      // Include assigned_to if it exists
      let assignedToId = lead.assigned_to || lead.assignedTo || null;
      if (assignedToId && typeof assignedToId === "object" && assignedToId !== null) {
        if (assignedToId.user_details && assignedToId.user_details.id) {
          assignedToId = assignedToId.user_details.id;
        } else {
          assignedToId = assignedToId.id || assignedToId.pk || assignedToId.uuid || null;
        }
      }

      if (assignedToId) {
        currentPayload.assigned_to = assignedToId;
      }

      await apiRequest(`/api/leads/${leadId}/`, {
        method: "PUT",
        body: JSON.stringify(currentPayload),
      });

      // Update lead in state
      const updatedLead = { ...lead, follow_up_status: "done", followupStatus: "done" };

      // Update leads state
      setLeads((prevLeads) => {
        const leadIndex = prevLeads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          const newLeads = [...prevLeads];
          newLeads[leadIndex] = updatedLead;
          return newLeads;
        }
        return prevLeads;
      });

      // Find which column the lead is in and re-categorize
      const fromColumn = Object.keys(columns).find((col) =>
        columns[col].some((l) => l.id === leadId)
      );

      if (fromColumn) {
        // Re-categorize all leads including the updated one
        setColumns((prev) => {
          const allLeads = [
            ...prev.Overdue,
            ...prev["Due Today"],
            ...prev.Upcoming,
            ...prev.Done,
          ];
          
          // Replace the lead in the list with updated version
          const leadIndex = allLeads.findIndex((l) => l.id === leadId);
          if (leadIndex >= 0) {
            allLeads[leadIndex] = updatedLead;
          } else {
            allLeads.push(updatedLead);
          }

          // Re-categorize all leads
          return categorizeLeads(allLeads);
        });
      }

      // Update cache
      const cachedData = getCachedLeadData();
      if (cachedData?.leads) {
        const leadIndex = cachedData.leads.findIndex((l) => l.id === leadId);
        if (leadIndex >= 0) {
          cachedData.leads[leadIndex] = updatedLead;
          cachedData.timestamp = Date.now();
          localStorage.setItem("leadDataCache", JSON.stringify(cachedData));
        }
      }
    } catch (error) {
      console.error("Failed to mark lead as done:", error);
      alert("Failed to mark lead as done");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Typography>Loading leads...</Typography>
      </Box>
    );
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <Box display="flex" gap={2} p={2} sx={{ overflowX: "auto" }}>
        {Object.keys(columns).map((column) => (
          <KanbanColumn
            key={column}
            title={column}
            leads={columns[column]}
            onMarkAsDone={handleMarkAsDone}
            setColumns={setColumns}
            statuses={statuses}
            getStatusName={(statusId) => getStatusName(statusId, statuses)}
          />
        ))}
      </Box>
    </DndContext>
  );
}

export default KanbanBoard;
