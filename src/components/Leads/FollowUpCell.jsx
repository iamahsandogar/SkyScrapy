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
  CircularProgress,
  Divider,
  Stack,
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
    
    // Initialize form data from lead
    let currentLead = lead;
    
    setFormData({
      follow_up_at: (currentLead.follow_up_at || currentLead.followUpAt) 
        ? dayjs(currentLead.follow_up_at || currentLead.followUpAt).format("YYYY-MM-DDTHH:mm") 
        : "",
      send_reminder_email:
        currentLead.send_reminder_email === true ||
        currentLead.send_reminder_email === "true" ||
        currentLead.send_reminder_email === 1,
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
        const followUpValue = formData.follow_up_at ? dayjs(formData.follow_up_at).format() : null;

        const patchPayload = {
            title: lead.title || "",
            follow_up_at: followUpValue,
            follow_up_status: lead.follow_up_status || "pending",
            send_reminder_email: formData.send_reminder_email,
            reminder_time_offset: formData.reminder_time_offset || null
        };
        
        try {
            await apiRequest(`/api/leads/${leadId}/`, {
                method: "PATCH",
                body: JSON.stringify(patchPayload),
            });
        } catch (patchError) {
            console.error("FollowUpCell: PATCH request failed", patchError);
            if (notifyError) notifyError("Failed to update lead details");
            setLoading(false);
            return;
        }

        if (formData.send_reminder_email) {
            const schedulePayload = {
                follow_up_at: followUpValue,
                send_reminder_email: true,
                reminder_time_offset: formData.reminder_time_offset || "exact",
            };

            await apiRequest(`/api/leads/${leadId}/schedule-follow-up/`, {
                method: "POST",
                body: JSON.stringify(schedulePayload),
            });
        }

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
        <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>{displayDate}</Typography>
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
        PaperProps={{
            elevation: 3,
            sx: { borderRadius: 2, overflow: "hidden" }
        }}
      >
        <Box sx={{ p: 2.5, width: 320, display: "flex", flexDirection: "column", gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                    Schedule Follow-up
                </Typography>
                {/* Optional close icon or badge could go here */}
            </Stack>
            <Divider />
            
            <TextField
                label="Follow-up Date & Time"
                type="datetime-local"
                value={formData.follow_up_at}
                onChange={(e) => setFormData({ ...formData, follow_up_at: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                variant="outlined"
            />
            
            <Box sx={{ bgcolor: "background.default", p: 1.5, borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={formData.send_reminder_email}
                            onChange={(e) => setFormData({ ...formData, send_reminder_email: e.target.checked })}
                            color="primary"
                        />
                    }
                    label={<Typography variant="body2" fontWeight={500}>Send Reminder Email</Typography>}
                />
                
                {formData.send_reminder_email && (
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
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
            </Box>
            
            <Button 
                variant="contained" 
                onClick={handleSave} 
                disabled={loading}
                fullWidth
                disableElevation
                sx={{ mt: 1, py: 1 }}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Save Schedule"}
            </Button>
        </Box>
      </Popover>
    </>
  );
};

export default FollowUpCell;
