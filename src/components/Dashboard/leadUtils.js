export const normalizeLeadsPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.leads)) return payload.leads;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.leads)) return payload.data.leads;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

export const resolveTextValue = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return (
      value.name ||
      value.label ||
      value.status ||
      value.title ||
      value.value ||
      ""
    );
  }
  return String(value);
};

export const getLeadTitle = (lead) => {
  if (!lead) return "Untitled Lead";
  return (
    lead.title ||
    lead.lead_title ||
    lead.name ||
    lead.full_name ||
    lead.contact_first_name ||
    lead.contact_last_name ||
    "Untitled Lead"
  );
};

export const getFollowUpTimestamp = (lead) => {
  if (!lead) return null;
  return (
    lead.follow_up_at ||
    lead.followUpAt ||
    lead.followupAt ||
    lead.follow_up_date ||
    lead.followUpDate ||
    lead.reminder_date ||
    lead.next_follow_up ||
    null
  );
};

export const formatFollowUpLabel = (value) => {
  if (!value) return "No follow-up scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Pending follow-up";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isConvertedStatus = (status) => {
  if (!status) return false;
  const statusName =
    typeof status === "string"
      ? status
      : status.name || status.label || status.title || status.status_name || "";
  
  if (!statusName) return false;
  
  const normalized = String(statusName).toLowerCase();
  return normalized.includes("converted") && normalized.includes("project");
};
