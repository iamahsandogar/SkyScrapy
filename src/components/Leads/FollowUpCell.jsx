import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Popover,
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import apiRequest from "../services/api";
import dayjs from "dayjs";

const FollowUpCell = ({ lead, onUpdate, notifySuccess, notifyError }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Local state for the popover form
  const [formData, setFormData] = useState({
    follow_up_at: "",
    send_reminder_email: false,
    reminder_time_offset: "exact",
  });

  const handleClick = async (event) => {
    event.stopPropagation();
    const target = event.currentTarget;
    
    // Initialize form data from lead, but check if we need to fetch fresh data
    // because the list view might not have all fields (send_reminder_email, reminder_time_offset)
    let currentLead = lead;
    
    if (currentLead.send_reminder_email === undefined) {
        // Show loading state if needed, or just fetch
        // We'll use a local loading state for the popover initialization if strictly needed,
        // but for now let's just fetch and then open.
        // Or better: open immediately with defaults, then fetch and update form.
        // Opening immediately feels snappier.
    }

    setFormData({
      follow_up_at: (currentLead.follow_up_at || currentLead.followUpAt) 
        ? dayjs(currentLead.follow_up_at || currentLead.followUpAt).format("YYYY-MM-DDTHH:mm") 
        : "",
      send_reminder_email: currentLead.send_reminder_email || false,
      reminder_time_offset: currentLead.reminder_time_offset || "exact",
    });
    
    setAnchorEl(target);
    
    // Fetch fresh data if missing
    if (currentLead.send_reminder_email === undefined) {
        const leadId = lead.id || lead.pk || lead.uuid;
        try {
             const response = await apiRequest(`/api/leads/${leadId}/`);
             const leadData = response.data || response;
             
             // Update form data with fresh values
             setFormData(prev => ({
                 ...prev,
                 send_reminder_email: leadData.send_reminder_email || false,
                 reminder_time_offset: leadData.reminder_time_offset || "exact",
                 // Preserve local edit of date if user was super fast? Unlikely.
                 // But let's sync date too if it wasn't edited yet.
                 follow_up_at: (leadData.follow_up_at) 
                    ? dayjs(leadData.follow_up_at).format("YYYY-MM-DDTHH:mm") 
                    : prev.follow_up_at
             }));
        } catch (e) {
             console.warn("Failed to fetch fresh lead details for reminder check", e);
        }
    }
  };

  const handleClose = (event) => {
    if (event) event.stopPropagation();
    setAnchorEl(null);
  };

  const handleSave = async (event) => {
    if (event) event.stopPropagation();
    setLoading(true);

    // Validation: If reminder is enabled, follow-up date must be selected
    if (formData.send_reminder_email && !formData.follow_up_at) {
        if (notifyError) notifyError("Please select a follow-up date/time to set a reminder.");
        setLoading(false);
        return;
    }

    const leadId = lead.id || lead.pk || lead.uuid;
    
    try {
        // Use dayjs format to match CreateLead.jsx and potentially backend expectations (local time with offset)
        // new Date().toISOString() returns UTC, which might be rejected or misinterpreted if backend expects offset
        const followUpValue = formData.follow_up_at ? dayjs(formData.follow_up_at).format() : null;

        // 1. Update Lead (PATCH) to ensure follow_up_at is saved on the lead model
        // We also include follow_up_status to be safe, as backend might validate it
        // We MUST include title as the backend requires it even for PATCH updates
        const patchPayload = {
            title: lead.title || "",
            follow_up_at: followUpValue,
            follow_up_status: lead.follow_up_status || "pending"
        };
        
        console.log("FollowUpCell: Sending PATCH payload:", patchPayload);
        
        try {
            await apiRequest(`/api/leads/${leadId}/`, {
                method: "PATCH",
                body: JSON.stringify(patchPayload),
            });
        } catch (patchError) {
            console.error("FollowUpCell: PATCH request failed (ignoring, will try schedule)", patchError);
            // We don't return here, we try to proceed to schedule-follow-up
            // as that might be the primary intent and might handle the update too.
        }

        // 2. Schedule Follow-up (POST)
        const schedulePayload = formData.send_reminder_email
            ? {
                follow_up_at: followUpValue,
                send_reminder_email: true,
                reminder_time_offset: formData.reminder_time_offset || "exact",
              }
            : {
                send_reminder_email: false,
                reminder_time_offset: null,
                follow_up_at: followUpValue,
            };

        console.log("FollowUpCell: Sending schedule-follow-up payload:", schedulePayload);

        await apiRequest(`/api/leads/${leadId}/schedule-follow-up/`, {
            method: "POST",
            body: JSON.stringify(schedulePayload),
        });

        // Update parent state
        if (onUpdate) {
            onUpdate({
                ...lead,
                follow_up_at: followUpValue,
                followUpAt: followUpValue,
                send_reminder_email: formData.send_reminder_email,
                reminder_time_offset: formData.reminder_time_offset
            });
        }
        
        if (notifySuccess) notifySuccess("Follow-up scheduled successfully");
        setAnchorEl(null);
        
    } catch (error) {
        console.error("Failed to schedule follow-up:", error);
        if (notifyError) notifyError("Failed to schedule follow-up");
    } finally {
        setLoading(false);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? "follow-up-popover" : undefined;
  
  // Format for display
  const displayDate = (lead.follow_up_at || lead.followUpAt) 
    ? dayjs(lead.follow_up_at || lead.followUpAt).format("MMM D, YYYY h:mm A")
    : "Set Follow-up";

  return (
    <>
      <Box 
        onClick={handleClick}
        sx={{ 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: 1,
            "&:hover": { 
                textDecoration: "underline",
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                borderRadius: "4px",
                p: "2px 4px",
                m: "-2px -4px"
            }
        }}
      >
        <Typography variant="body2">{displayDate}</Typography>
        {lead.send_reminder_email && (
            <NotificationsActiveIcon color="primary" sx={{ fontSize: 16 }} />
        )}
      </Box>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2, width: 300, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Schedule Follow-up</Typography>
            <TextField
                label="Follow-up Date & Time"
                type="datetime-local"
                value={formData.follow_up_at}
                onChange={(e) => setFormData({ ...formData, follow_up_at: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
            />
            
            <FormControlLabel
                control={
                    <Checkbox
                        checked={formData.send_reminder_email}
                        onChange={(e) => setFormData({ ...formData, send_reminder_email: e.target.checked })}
                    />
                }
                label="Send Reminder Email"
            />
            
            {formData.send_reminder_email && (
                <FormControl fullWidth size="small">
                    <InputLabel>Reminder Offset</InputLabel>
                    <Select
                        value={formData.reminder_time_offset || "exact"}
                        label="Reminder Offset"
                        onChange={(e) => setFormData({ ...formData, reminder_time_offset: e.target.value })}
                    >
                        <MenuItem value="exact">Exact (at follow-up time)</MenuItem>
                        <MenuItem value="30min">30 minutes before</MenuItem>
                        <MenuItem value="1hour">1 hour before</MenuItem>
                        <MenuItem value="1day">1 day before</MenuItem>
                    </Select>
                </FormControl>
            )}
            
            <Button 
                variant="contained" 
                onClick={handleSave} 
                disabled={loading}
                fullWidth
                size="small"
            >
                {loading ? "Saving..." : "Save"}
            </Button>
        </Box>
      </Popover>
    </>
  );
};

export default FollowUpCell;
