import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import dayjs from "dayjs";
import apiRequest from "../services/api";
import {
  addLeadToCache,
  clearLeadDataCache,
  getCachedLeadData,
} from "../../utils/prefetchData";
import DotLoader from "../global/DotLoader";
import { useNotification } from "../../contexts/NotificationContext.jsx";
import LeadFormFields from "./LeadFormFields";
import { parseEmployeesPayload, isValidLinkedInURL, filterAssignableEmployees } from "./leadFormUtils";

const EMPTY_FORM = {
  title: "",
  status: null,
  source: "",
  lifecycle: "",
  description: "",
  company_name: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_email: "",
  contact_phone: "",
  contact_position_title: "",
  contact_linkedin_url: "",
  assigned_to: null,
  follow_up_at: null,
  follow_up_time: null,
  follow_up_status: "",
  send_reminder_email: false,
  reminder_time_offset: "exact",
};

const getCurrentUserInfo = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return {};
  try {
    const userData = JSON.parse(storedUser);
    const currentUserId = userData.id || userData.pk || userData.uuid || null;
    const isAdmin =
      userData.is_staff ||
      userData.is_admin ||
      userData.is_superuser ||
      userData.role === 0 ||
      userData.role === "0";
    return { userData, currentUserId, isAdmin };
  } catch (error) {
    console.warn("Failed to parse stored user while opening edit dialog:", error);
    return {};
  }
};

const extractNameParts = (assignedObj = {}) => {
  const ud = assignedObj.user_details || assignedObj.userDetails || assignedObj.user;
  const firstName =
    assignedObj.first_name || assignedObj.firstName || ud?.first_name || ud?.firstName || "";
  const lastName =
    assignedObj.last_name || assignedObj.lastName || ud?.last_name || ud?.lastName || "";
  return { firstName, lastName };
};



export default function EditLeadModal({ open, leadId, lead: initialLead, onClose, onSuccess }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState({ status: [], source: [], lifecycle: [] });
  const [employees, setEmployees] = useState([]);
  const [loadingLead, setLoadingLead] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { notifyError, notifySuccess } = useNotification();

  useEffect(() => {
    if (!open) {
      setFormData(EMPTY_FORM);
      setMeta({ status: [], source: [], lifecycle: [] });
      setEmployees([]);
      setIsDataLoaded(false);
      setLoadingLead(false);
      setIsSubmitting(false);
      return;
    }

    if (!leadId) return;

    const { userData, currentUserId, isAdmin: userIsAdmin } = getCurrentUserInfo();
    setIsAdmin(userIsAdmin);

    const loadMetaFromCache = () => {
      const cachedData = getCachedLeadData();
      setMeta({
        status: cachedData?.statuses || [],
        source: cachedData?.sources || [],
        lifecycle: cachedData?.lifecycles || [],
        assigned_to: cachedData?.assigned_to || null,
      });

      const employeePayload = parseEmployeesPayload(cachedData?.employees);
      const filtered = filterAssignableEmployees(
        employeePayload,
        currentUserId,
        userIsAdmin
      );

      if (filtered.length > 0) {
        setEmployees(filtered);
        return filtered;
      }

      if (currentUserId) {
        const fallback = [
          {
            id: currentUserId,
            firstName:
              userData?.firstName || userData?.first_name || userData?.name,
            lastName: userData?.lastName || userData?.last_name || "",
            user_id: currentUserId,
          },
        ];
        setEmployees(fallback);
        return fallback;
      }

      setEmployees([]);
      return [];
    };

    const fetchLeadFromApi = async (id) => {
      try {
        return await apiRequest(`/api/leads/${id}/`);
      } catch (error) {
        console.warn("Trailing slash failed, trying fallback:", error);
        return await apiRequest(`/api/leads/${id}`);
      }
    };


    const getLeadFromCache = (id) => {
      const cached = getCachedLeadData();
      if (!cached || !Array.isArray(cached.leads)) return null;
      return cached.leads.find((entry) => {
        const candidateId = entry.id || entry.pk || entry.uuid;
        return String(candidateId) === String(id);
      }) || null;
    };

    const normalizeLeadPayload = (leadResponse) => {
      if (!leadResponse) return null;
      if (Array.isArray(leadResponse) && leadResponse.length > 0) {
        return leadResponse[0];
      }
      if (leadResponse.lead_obj) return leadResponse.lead_obj;
      if (leadResponse.lead) return leadResponse.lead;
      if (leadResponse.data) return leadResponse.data.lead || leadResponse.data;
      return leadResponse;
    };

    const populateFormWithLeadData = (
      leadResponse,
      adminFlag,
      userId,
      employeeList = [],
      fromCache = false
    ) => {
      if (!leadResponse) return;
      const leadPayload = normalizeLeadPayload(leadResponse);
      if (!leadPayload) return;

      const statusObj = typeof leadPayload.status === "object" ? leadPayload.status : null;
      const statusIdRaw = statusObj ? statusObj.id || statusObj.pk : leadPayload.status;
      const statusId =
        statusIdRaw === undefined || statusIdRaw === null
          ? null
          : typeof statusIdRaw === "string"
            ? Number.isNaN(parseInt(statusIdRaw, 10))
              ? statusIdRaw
              : parseInt(statusIdRaw, 10)
            : statusIdRaw;

      // Extract lifecycle ID similar to status
      const lifecycleObj = typeof leadPayload.lifecycle === "object" ? leadPayload.lifecycle : null;
      const lifecycleIdRaw = lifecycleObj
        ? (lifecycleObj.id || lifecycleObj.pk || lifecycleObj.uuid)
        : (leadPayload.lifecycle_id || leadPayload.lifecycleId || leadPayload.lifecycle);
      const lifecycleId =
        lifecycleIdRaw === undefined || lifecycleIdRaw === null || lifecycleIdRaw === ""
          ? null
          : typeof lifecycleIdRaw === "string"
            ? Number.isNaN(parseInt(lifecycleIdRaw, 10))
              ? lifecycleIdRaw
              : parseInt(lifecycleIdRaw, 10)
            : lifecycleIdRaw;

      let assignedToValue = leadPayload.assigned_to || leadPayload.assignedTo || null;
      let assignedProfileId = null;
      if (assignedToValue && typeof assignedToValue === "object") {
        assignedProfileId = assignedToValue.id || assignedToValue.pk || assignedToValue.uuid || null;
        assignedToValue = assignedToValue.user_details?.id || assignedProfileId;
      }

      const followUpDateTime = leadPayload.follow_up_at || leadPayload.followUpAt;
      let followUpDate = null;
      let followUpTime = null;
      if (followUpDateTime) {
        const parsed = dayjs(followUpDateTime);
        if (parsed.isValid()) {
          followUpDate = parsed.startOf("day");
          followUpTime = dayjs()
            .hour(parsed.hour())
            .minute(parsed.minute())
            .second(0)
            .millisecond(0);
        }
      }

      if (!followUpTime && (leadPayload.follow_up_time || leadPayload.followUpTime)) {
        const timeValue = leadPayload.follow_up_time || leadPayload.followUpTime;
        const parsedTime = typeof timeValue === "string" && timeValue.includes(":")
          ? dayjs(timeValue, "HH:mm")
          : dayjs(timeValue);
        if (parsedTime.isValid()) {
          followUpTime = parsedTime;
        }
      }

      let finalAssignedTo = assignedToValue;
      const originalAssigned = leadPayload.assigned_to || leadPayload.assignedTo;
      if (adminFlag) {
        if (originalAssigned && typeof originalAssigned === "object" && originalAssigned.id) {
          finalAssignedTo = originalAssigned.id;
        } else if (!finalAssignedTo && assignedProfileId) {
          finalAssignedTo = assignedProfileId;
        }

        const availableEmployees = Array.isArray(employeeList) ? employeeList : [];
        if (availableEmployees.length > 0 && finalAssignedTo) {
          let matchedEmp = null;
          if (originalAssigned && typeof originalAssigned === "object" && originalAssigned.id) {
            const profileIdStr = String(originalAssigned.id).trim();
            matchedEmp = availableEmployees.find((emp) => {
              const empId = emp.id || emp.pk || emp.uuid;
              return empId && String(empId).trim() === profileIdStr;
            });
          }

          if (!matchedEmp && assignedToValue) {
            matchedEmp = availableEmployees.find((emp) => {
              const empId = emp.id || emp.pk || emp.uuid;
              const empUserId = emp.user_id || emp.userId || emp.user_details?.id;
              return (
                String(empId) === String(assignedToValue) ||
                String(empUserId) === String(assignedToValue)
              );
            });
          }

          if (matchedEmp) {
            finalAssignedTo = matchedEmp.id || matchedEmp.pk || matchedEmp.uuid;
          }
        }
      }
      const availableEmployees = Array.isArray(employeeList) ? employeeList : [];

      if (availableEmployees.length > 0 && finalAssignedTo) {
        let matchedEmp = null;

        matchedEmp = availableEmployees.find((emp) => {
          const empId = emp.id || emp.pk || emp.uuid;
          return empId && String(empId) === String(finalAssignedTo);
        });

        if (!matchedEmp) {
          matchedEmp = availableEmployees.find((emp) => {
            const empUserId =
              emp.user_id ||
              emp.userId ||
              emp.user_details?.id ||
              emp.userDetails?.id;
            return empUserId && String(empUserId) === String(finalAssignedTo);
          });
        }

        if (matchedEmp) {
          finalAssignedTo = matchedEmp.id || matchedEmp.pk || matchedEmp.uuid;
        }
      }

      // Ensure assigned user shows in dropdown even if not in cached employees
      if (finalAssignedTo) {
        // Use setTimeout to ensure this runs after the main employee state update
        setTimeout(() => {
          setEmployees((prev) => {
            const has = prev.some((emp) => {
              const empId = emp.id || emp.pk || emp.uuid;
              const userDetails = emp.user_details || emp.userDetails || emp.user;
              const empUserId =
                emp.user_id ||
                emp.userId ||
                (userDetails && typeof userDetails === "object" && (userDetails.id || userDetails.user_id || userDetails.userId));
              return (
                (empId && String(empId) === String(finalAssignedTo)) ||
                (empUserId && String(empUserId) === String(finalAssignedTo))
              );
            });
            if (has) return prev;

            let { firstName, lastName } = extractNameParts(originalAssigned || {});
            
            // If name missing in originalAssigned (e.g. it was just an ID), try to find in availableEmployees
            if (!firstName && !lastName && availableEmployees.length > 0) {
                 const found = availableEmployees.find(e => {
                     const eId = e.id || e.pk || e.uuid;
                     return String(eId) === String(finalAssignedTo);
                 });
                 if (found) {
                     const parts = extractNameParts(found);
                     firstName = parts.firstName;
                     lastName = parts.lastName;
                 }
            }

            const synthetic = {
              id: String(finalAssignedTo),
              firstName: firstName || "Unknown",
              lastName: lastName || "",
              user_id: String(finalAssignedTo),
              user_details: originalAssigned?.user_details,
              // Add dummy role to prevent filtering issues if any
              role: "employee" 
            };
            return [...prev, synthetic];
          });
        }, 0);
      }

      const preparedForm = {
        title: leadPayload.title || leadPayload.leadTitle || "",
        status: statusId,
        source: leadPayload.source || "",
        lifecycle: lifecycleId,
        description: leadPayload.description || "",
        company_name: leadPayload.company_name || leadPayload.company || "",
        contact_first_name:
          leadPayload.contact_first_name || leadPayload.firstName || "",
        contact_last_name:
          leadPayload.contact_last_name || leadPayload.lastName || "",
        contact_email: leadPayload.contact_email || leadPayload.email || "",
        contact_phone: leadPayload.contact_phone || leadPayload.phone || "",
        contact_position_title:
          leadPayload.contact_position_title || leadPayload.positionTitle || "",
        contact_linkedin_url:
          leadPayload.contact_linkedin_url || leadPayload.linkedIn || "",
        assigned_to:
          finalAssignedTo === null || finalAssignedTo === undefined
            ? null
            : String(finalAssignedTo),
        follow_up_at: followUpDate,
        follow_up_time: followUpTime,
        follow_up_status:
          leadPayload.follow_up_status || leadPayload.followupStatus || "",
        send_reminder_email: leadPayload.send_reminder_email !== undefined ? Boolean(leadPayload.send_reminder_email) : false,
        reminder_time_offset:
          leadPayload.reminder_time_offset ||
          leadPayload.reminder_offset ||
          "exact",
      };

      setFormData(preparedForm);
      setIsDataLoaded(true);
    };

    const loadLead = async () => {
      setLoadingLead(true);
      const cachedEmployees = loadMetaFromCache();
      const cachedLead = getLeadFromCache(leadId) || initialLead;
      if (cachedLead) {
        populateFormWithLeadData(
          cachedLead,
          userIsAdmin,
          currentUserId,
          cachedEmployees,
          true
        );
        setIsDataLoaded(true);
      }

      try {
        const apiLead = await fetchLeadFromApi(leadId);
        if (!apiLead) {
          if (cachedLead) {
            setIsDataLoaded(true);
            return;
          }
          throw new Error("No lead data returned from API");
        }

        const apiStatuses =
          (Array.isArray(apiLead?.statuses) && apiLead.statuses) ||
          (Array.isArray(apiLead?.data?.statuses) && apiLead.data.statuses);
        const apiSources =
          (Array.isArray(apiLead?.sources) && apiLead.sources) ||
          (Array.isArray(apiLead?.data?.sources) && apiLead.data.sources);
        const apiLifecycles =
          (Array.isArray(apiLead?.lifecycles) && apiLead.lifecycles) ||
          (Array.isArray(apiLead?.data?.lifecycles) && apiLead.data.lifecycles);
        const apiEmployeesRaw =
          (Array.isArray(apiLead?.employees) && apiLead.employees) ||
          (Array.isArray(apiLead?.users) && apiLead.users) ||
          (Array.isArray(apiLead?.data?.employees) && apiLead.data.employees) ||
          (Array.isArray(apiLead?.data?.users) && apiLead.data.users);

        if (apiStatuses) {
          setMeta((prev) => ({ ...prev, status: apiStatuses }));
        }
        if (apiSources) {
          setMeta((prev) => ({ ...prev, source: apiSources }));
        }
        if (apiLifecycles) {
          setMeta((prev) => ({ ...prev, lifecycle: apiLifecycles }));
        }
        let employeesForResolution = cachedEmployees;

        if (apiEmployeesRaw) {
          const parsedEmployees = parseEmployeesPayload(apiEmployeesRaw);
          const filteredEmployees = filterAssignableEmployees(
            parsedEmployees,
            currentUserId,
            userIsAdmin
          );
          setEmployees(filteredEmployees);
          employeesForResolution = parsedEmployees;
        }

        populateFormWithLeadData(apiLead, userIsAdmin, currentUserId, employeesForResolution);
        // Ensure latest API lead is reflected even if cache was shown first
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load lead details:", error);
        notifyError(
          `Failed to load lead data.\n\nError: ${error.message || "Unknown error"}\n\nPlease refresh and try again.`
        );
      } finally {
        setLoadingLead(false);
      }
      setIsDataLoaded(true);
    };

    loadLead();
  }, [open, leadId, notifyError]);

  const validateForm = () => {
    const requiredFields = ["title", "status"];
    if (isAdmin) {
      requiredFields.push("assigned_to");
    }

    for (const field of requiredFields) {
      if (
        !formData[field] ||
        (typeof formData[field] === "string" && formData[field].trim() === "")
      ) {
        return false;
      }
    }

    if (
      formData.contact_linkedin_url &&
      !isValidLinkedInURL(formData.contact_linkedin_url)
    ) {
      notifyError("Please enter a valid LinkedIn URL !");
      return false;
    }

    // Validate FollowUpStatus requirement
    // If FollowUpAt is set (meaning a date is selected), then FollowUpStatus is required
    // We check if follow_up_at is present, and if so, follow_up_status must not be empty
    if (formData.follow_up_at) {
      const statusValue = formData.follow_up_status;
      if (
        statusValue === undefined ||
        statusValue === null ||
        (typeof statusValue === "string" && statusValue.trim() === "")
      ) {
        console.log("❌ Validation failed: Follow-up-status is required when followUpAt is given");
        notifyError("Follow-up-status is required when followUpAt is given");
        return false;
      }
    }

    // Validate FollowUpAt requirement
    // If FollowUpStatus is provided, then FollowUpAt is required
    const statusValue = formData.follow_up_status;
    const hasStatus = statusValue !== undefined && 
                      statusValue !== null && 
                      (typeof statusValue !== "string" || statusValue.trim() !== "");
    
    if (hasStatus && !formData.follow_up_at) {
      console.log("❌ Validation failed: Follow_up_at is required when Follow_up_status is provided");
      notifyError("Follow_up_at is required when Follow_up_status is provided.");
      return false;
    }

    // Validate FollowUpAt is not in the past
    if (formData.follow_up_at) {
      const followUpDateTime = dayjs(formData.follow_up_at);
      if (formData.follow_up_time) {
        // Combine date and time
        const combinedDateTime = followUpDateTime
          .hour(dayjs(formData.follow_up_time).hour())
          .minute(dayjs(formData.follow_up_time).minute())
          .second(0)
          .millisecond(0);
        
        if (combinedDateTime.isBefore(dayjs(), 'minute')) {
          console.log("❌ Validation failed: Followupat should not be in past");
          notifyError("Followupat should not be in past.");
          return false;
        }
      } else {
        // If only date is set, check if it's before today
        if (followUpDateTime.isBefore(dayjs(), 'day')) {
          console.log("❌ Validation failed: Followupat should not be in past");
          notifyError("Followupat should not be in past.");
          return false;
        }
      }
    }

    return true;
  };

  const buildPayload = () => {
    const payload = {
      title: formData.title.trim(),
      status: formData.status, // Already an ID from form
      source: formData.source?.trim() || "",
      lifecycle: formData.lifecycle || null, // Already an ID from form
      description: formData.description?.trim() || "",
      company_name: formData.company_name?.trim() || "",
      contact_first_name: formData.contact_first_name.trim(),
      contact_last_name: formData.contact_last_name?.trim() || "",
      contact_email: formData.contact_email.trim(),
      contact_phone: formData.contact_phone?.trim() || "",
      contact_position_title: formData.contact_position_title.trim(),
      contact_linkedin_url: formData.contact_linkedin_url.trim(),
      follow_up_at: (() => {
        if (formData.follow_up_at && formData.follow_up_time) {
          const date = dayjs(formData.follow_up_at);
          const time = dayjs(formData.follow_up_time);
          return date
            .hour(time.hour())
            .minute(time.minute())
            .second(0)
            .millisecond(0)
            .format();
        } else if (formData.follow_up_at) {
          return dayjs(formData.follow_up_at).startOf("day").format();
        }
        return null;
      })(),
      follow_up_status: formData.follow_up_status?.trim() || "",
      send_reminder_email: formData.send_reminder_email,
      reminder_time_offset: formData.reminder_time_offset || null,
    };

    if (formData.assigned_to) {
      payload.assigned_to = formData.assigned_to;
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // notifyError("Please fill all required fields !"); // Handled in validateForm
      return;
    }

    // Validation: If reminder is enabled, follow-up date must be selected
    if (formData.send_reminder_email && !formData.follow_up_at) {
      notifyError("Please select a follow-up date/time to set a reminder.");
      return;
    }

    const payload = buildPayload();
    setIsSubmitting(true);

    try {
      const response = await apiRequest(`/api/leads/${leadId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      notifySuccess("Lead updated successfully!",
            { autoClose: 5000 }
          );

      // Calculate follow_up_at value for schedule call
      const followUpValue = (() => {
        if (formData.follow_up_at && formData.follow_up_time) {
          const date = dayjs(formData.follow_up_at);
          const time = dayjs(formData.follow_up_time);
          return date
            .hour(time.hour())
            .minute(time.minute())
            .second(0)
            .millisecond(0)
            .format();
        } else if (formData.follow_up_at) {
          return dayjs(formData.follow_up_at).startOf("day").format();
        }
        return null;
      })();

      // Schedule follow-up - Only if reminder is enabled OR follow_up_at is set
      // We want to update follow-up details even if reminder is not checked, if a date is set
      if (followUpValue) {
        const followUpPayload = {
          follow_up_at: followUpValue,
          follow_up_status: formData.follow_up_status, // Include status
          send_reminder_email: formData.send_reminder_email,
          reminder_time_offset: formData.reminder_time_offset || "exact",
        };

        try {
          await apiRequest(`/api/leads/${leadId}/schedule-follow-up/`, {
            method: "POST",
            body: JSON.stringify(followUpPayload),
          });
          console.log("Schedule follow-up called successfully");
        } catch (error) {
          console.error("Failed to schedule follow-up:", error);
          notifyError(
            "Lead updated, but you cannot schedule reminders for leads in past",
            { autoClose: 5000 }
          );
        }
      }

      let updatedLead = null;
      if (response) {
        if (response.lead) {
          updatedLead = response.lead;
        } else if (response.data) {
          updatedLead = response.data.lead || response.data;
        } else if (Array.isArray(response)) {
          updatedLead = response[0];
        } else {
          updatedLead = response;
        }
      }

      if (updatedLead) {
        const storedUser = localStorage.getItem("user");
        let currentUserId = null;
        if (storedUser && !isAdmin) {
          const stored = JSON.parse(storedUser);
          currentUserId = stored.id || stored.pk || stored.uuid;
        }

        const mergedLead = {
          ...updatedLead,
          title: updatedLead.title || formData.title,
          status: updatedLead.status || formData.status,
          source: updatedLead.source || formData.source,
          lifecycle: updatedLead.lifecycle || formData.lifecycle,
          description: updatedLead.description || formData.description,
          company_name:
            updatedLead.company_name || formData.company_name,
          contact_first_name:
            updatedLead.contact_first_name || formData.contact_first_name,
          contact_last_name:
            updatedLead.contact_last_name || formData.contact_last_name,
          contact_email: updatedLead.contact_email || formData.contact_email,
          contact_phone: updatedLead.contact_phone || formData.contact_phone,
          contact_position_title:
            updatedLead.contact_position_title ||
            formData.contact_position_title,
          contact_linkedin_url:
            updatedLead.contact_linkedin_url || formData.contact_linkedin_url,
          follow_up_at:
            updatedLead.follow_up_at ||
            (formData.follow_up_at && formData.follow_up_time
              ? dayjs(formData.follow_up_at)
                .hour(dayjs(formData.follow_up_time).hour())
                .minute(dayjs(formData.follow_up_time).minute())
                .second(0)
                .millisecond(0)
                .format()
              : formData.follow_up_at
                ? dayjs(formData.follow_up_at).startOf("day").format()
                : null),
          follow_up_status:
            updatedLead.follow_up_status || formData.follow_up_status,
          assigned_to:
            updatedLead.assigned_to ||
            updatedLead.assignedTo ||
            formData.assigned_to,
          send_reminder_email: formData.send_reminder_email,
          reminder_time_offset: formData.reminder_time_offset,
        };

        addLeadToCache(mergedLead);
        onSuccess?.(mergedLead);
      } else {
        clearLeadDataCache();
      }

      onClose?.();
    } catch (error) {
      console.error("Edit Lead Error:", error);
      let message = error.message || "Failed to update lead";

      // Check for duplicate lead title error
      if (
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("unique constraint") ||
        message.toLowerCase().includes("unique") ||
        (error.data?.title && Array.isArray(error.data.title) && error.data.title.some(msg => msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("unique")))
      ) {
        notifyError("Lead already exists with this title");
        return;
      }

      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="lg">
      <DialogTitle>Edit Lead</DialogTitle>
      <DialogContent dividers>
        {loadingLead && !isDataLoaded ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            py={4}
            gap={1}
          >
            <DotLoader size={36} color="#0A66C2" />
            <Typography>Loading lead details...</Typography>
          </Box>
        ) : (
          <LeadFormFields
            formData={formData}
            employees={employees}
            meta={meta}
            loadingMeta={false}
            onChange={(event) =>
              setFormData({ ...formData, [event.target.name]: event.target.value })
            }
            onAssignedToChange={(value) =>
              setFormData({ ...formData, assigned_to: value })
            }
            onDateChange={(value) =>
              setFormData({
                ...formData,
                follow_up_at: value,
                ...(value ? {} : { send_reminder_email: false, reminder_time_offset: null }),
              })
            }
            onTimeChange={(value) =>
              setFormData({
                ...formData,
                follow_up_time: value,
                ...(value ? {} : { send_reminder_email: false, reminder_time_offset: null }),
              })
            }
            onReminderToggle={(checked) =>
              setFormData((prev) => ({
                ...prev,
                send_reminder_email:
                  checked && prev.follow_up_at && prev.follow_up_time ? checked : false,
                reminder_time_offset: checked ? (prev.reminder_time_offset || "exact") : null,
              }))
            }
            onReminderOffsetChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                reminder_time_offset: value,
              }))
            }
            onLinkedInBlur={() => {
              if (
                formData.contact_linkedin_url &&
                !isValidLinkedInURL(formData.contact_linkedin_url)
              ) {
                notifyError(
                  "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)"
                );
              }
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} variant="outlined">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loadingLead || isSubmitting}
        >
          {isSubmitting ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Updating...
            </Box>
          ) : (
            "Update Lead"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );

}
