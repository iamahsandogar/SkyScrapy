import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import LeadNotesChat from "../Leads/LeadNotesChat";
import apiRequest from "../services/api";
import { colors } from "../../design-system/tokens";
import { getCachedLeadData } from "../../utils/prefetchData";

const toLeadArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.leads)) return payload.leads;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const normalizeLeadId = (lead) => {
  if (!lead) return null;
  return lead.id ?? lead.pk ?? lead.uuid ?? lead.lead_id ?? null;
};

const getAssignedName = (lead) => {
  const assignee = lead?.assigned_to || lead?.assignedTo || lead?.owner || lead?.employee;
  if (!assignee) return "";
  if (typeof assignee === "string") return assignee;
  const nameParts = [
    assignee.name,
    `${assignee.first_name || ""} ${assignee.last_name || ""}`.trim(),
    assignee.username,
    assignee.email,
  ];
  return nameParts.find(Boolean) || "";
};

const formatLeadLabel = (lead) => {
  if (!lead) return "Untitled lead";
  if (lead.title) return lead.title;
  if (lead.name) return lead.name;
  if (lead.company) return lead.company;
  if (lead.email) return lead.email;
  const firstName = lead.first_name || lead.firstName;
  const lastName = lead.last_name || lead.lastName;
  if (firstName || lastName) {
    return `${firstName || ""} ${lastName || ""}`.trim();
  }
  return "Lead";
};

const formatLeadDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const formatLeadMeta = (lead) => {
  const parts = [];
  if (lead.status) {
    parts.push(String(lead.status));
  }
  const assigned = getAssignedName(lead);
  if (assigned) {
    parts.push(`Assigned to ${assigned}`);
  }
  const followUp = lead.follow_up_at || lead.followup_at || lead.followUpAt;
  const followUpFormatted = formatLeadDate(followUp);
  if (followUpFormatted) {
    parts.push(`Follow-up ${followUpFormatted}`);
  }
  return parts.join(" • ");
};

const sortLeadsByDate = (lead) => {
  const value =
    lead.follow_up_at || lead.followup_at || lead.followUpAt || lead.created_at || lead.createdAt;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
};

const buildLeadOptions = (leads) => {
  if (!leads?.length) return [];
  return leads
    .slice()
    .sort((a, b) => sortLeadsByDate(b) - sortLeadsByDate(a))
    .map((lead) => {
      const id = normalizeLeadId(lead);
      if (!id) return null;
      return {
        id: String(id),
        title: formatLeadLabel(lead),
        meta: formatLeadMeta(lead),
      };
    })
    .filter(Boolean);
};

export default function LeadNotesPanel() {
  const [leadOptions, setLeadOptions] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadError, setLeadError] = useState("");

  const updateOptions = useCallback((rawLeads) => {
    const normalized = buildLeadOptions(rawLeads);
    setLeadOptions(normalized);
    setSelectedLeadId((prev) => {
      if (!normalized.length) return "";
      const existing = normalized.some((option) => option.id === prev);
      return existing ? prev : normalized[0].id;
    });
  }, []);

  const fetchLeadsFromApi = useCallback(async () => {
    setLoadingLeads(true);
    setLeadError("");
    try {
      const response = await apiRequest("/api/leads/?page_size=6");
      const fetchedLeads = toLeadArray(response);
      if (!fetchedLeads.length) {
        throw new Error("Leads API returned an empty list");
      }
      updateOptions(fetchedLeads);
    } catch (error) {
      console.error("Failed to load leads for notes panel", error);
      setLeadError("Unable to load lead context right now.");
    } finally {
      setLoadingLeads(false);
    }
  }, [updateOptions]);

  useEffect(() => {
    const cached = getCachedLeadData();
    if (cached?.leads?.length) {
      updateOptions(cached.leads);
    } else {
      fetchLeadsFromApi();
    }
  }, [fetchLeadsFromApi, updateOptions]);

  const handleSelectLead = (event) => {
    setSelectedLeadId(event.target.value);
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: "320px",
        borderRadius: "12px",
        padding: 3,
        backgroundColor: colors.bg[100],
        border: `1px solid ${colors.grey[900]}`,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="h6" fontWeight={700}>
          Lead Notes
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            size="small"
            variant="text"
            onClick={fetchLeadsFromApi}
            disabled={loadingLeads}
            sx={{ textTransform: "none" }}
          >
            {loadingLeads ? "Refreshing leads" : "Reload leads"}
          </Button>
          {loadingLeads && <CircularProgress size={18} />}
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" mt={0.5}>
        Conversation style updates between manager and employee for a selected lead.
      </Typography>

      <Box mt={2}>
        <FormControl fullWidth size="small">
          <InputLabel id="lead-select-label">Lead</InputLabel>
          <Select
            labelId="lead-select-label"
            value={selectedLeadId}
            label="Lead"
            displayEmpty
            onChange={handleSelectLead}
            disabled={!leadOptions.length && !loadingLeads}
          >
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">
                {loadingLeads ? "Looking for leads..." : "Choose a lead"}
              </Typography>
            </MenuItem>
            {leadOptions.map((lead) => (
              <MenuItem key={lead.id} value={lead.id}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {lead.title}
                  </Typography>
                  {lead.meta && (
                    <Typography variant="caption" color="text.secondary">
                      {lead.meta}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {leadError && (
          <Typography variant="caption" color="error" mt={1}>
            {leadError}
          </Typography>
        )}
        {!leadOptions.length && !loadingLeads && !leadError && (
          <Typography variant="caption" color="text.secondary" mt={1}>
            No leads synced yet. Create or refresh a lead to start the chat.
          </Typography>
        )}
      </Box>

      <Box mt={2}>
        <LeadNotesChat leadId={selectedLeadId || undefined} />
      </Box>
    </Box>
  );
}
