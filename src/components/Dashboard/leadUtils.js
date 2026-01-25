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
  
  const normalized = String(statusName).toLowerCase().trim();
  
  // Check for various patterns that indicate a lead has been converted to a project
  // Patterns: "converted to project", "converted project", "project converted", etc.
  const convertedPatterns = [
    "converted to project",
    "converted project",
    "project converted",
    "converted-to-project",
    "converted_to_project",
    "project-converted",
    "project_converted",
  ];
  
  // Check if the status matches any converted pattern
  const matchesConvertedPattern = convertedPatterns.some(pattern => 
    normalized.includes(pattern)
  );
  
  // Also check if it contains both "converted" and "project" (more flexible)
  const hasConvertedAndProject = normalized.includes("converted") && normalized.includes("project");
  
  return matchesConvertedPattern || hasConvertedAndProject;
};

/**
 * Check if a lead has been converted to a project
 * @param {Object} lead - The lead object to check
 * @param {Set<string>} projectIds - Optional set of project IDs to check against
 * @returns {boolean} - True if the lead is a project
 */
export const isProject = (lead, projectIds = null) => {
  if (!lead) return false;
  
  // Check if lead ID is in the projects list
  if (projectIds && projectIds.size > 0) {
    const leadId = String(lead.id || lead.pk || lead.uuid || "");
    if (projectIds.has(leadId)) {
      return true;
    }
  }
  
  // Check various field names for is_project flag
  const hasProjectFlag = 
    lead.is_project === true || 
    lead.is_project === 1 ||
    lead.is_project === "true" ||
    lead.is_project === "1" ||
    lead.isProject === true ||
    lead.isProject === 1 ||
    lead.isProject === "true" ||
    lead.isProject === "1" ||
    lead.is_project === "True" ||
    lead.isProject === "True";
  
  if (hasProjectFlag) {
    return true;
  }
  
  // Check status name for converted patterns
  const statusVal =
    lead.status_label ||
    lead.statusName ||
    lead.status_name ||
    (lead.status && typeof lead.status === "object" ? lead.status.name : null);
  
  if (statusVal && isConvertedStatus(statusVal)) {
    return true;
  }
  
  return false;
};

export const getAssignedToName = (lead, employees = []) => {
  if (!lead) return "";
  const assignedTo = lead.assigned_to || lead.assignedTo;
  if (!assignedTo && assignedTo !== 0) return "";
  
  // If it's a string (name)
  if (typeof assignedTo === "string" && isNaN(assignedTo)) return assignedTo;

  // If it's an object
  if (typeof assignedTo === "object" && assignedTo !== null) {
    // Try user_details first
    if (assignedTo.user_details) {
      const { first_name, last_name, firstName, lastName } = assignedTo.user_details;
      const f = first_name || firstName || "";
      const l = last_name || lastName || "";
      const name = `${f} ${l}`.trim();
      if (name) return name;
    }
    
    // Try direct fields
    if (assignedTo.name) return assignedTo.name;
    if (assignedTo.full_name) return assignedTo.full_name;
    
    // Try constructing from first/last
    const f = assignedTo.first_name || assignedTo.firstName || "";
    const l = assignedTo.last_name || assignedTo.lastName || "";
    const name = `${f} ${l}`.trim();
    if (name) return name;
  }

  // If we have employees list and assignedTo might be an ID
  if (employees && employees.length > 0) {
    let idToFind = null;
    if (typeof assignedTo === 'object' && assignedTo !== null) {
      idToFind = assignedTo.id || assignedTo.pk || assignedTo.uuid;
    } else {
      idToFind = assignedTo;
    }

    if (idToFind) {
      const idStr = String(idToFind);
      const emp = employees.find(e => String(e.id || e.pk || e.uuid) === idStr);
      if (emp) {
        // construct name
        const f = emp.first_name || emp.firstName || "";
        const l = emp.last_name || emp.lastName || "";
        const name = `${f} ${l}`.trim();
        if (name) return name;
      }
    }
  }
  
  // Return ID as fallback if nothing else found
  if (typeof assignedTo !== 'object') return String(assignedTo);
  
  // If it's an object but we couldn't find a name or look it up, try to return the ID
  if (typeof assignedTo === 'object' && assignedTo !== null) {
    return String(assignedTo.id || assignedTo.pk || assignedTo.uuid || "");
  }

  return "";
};
