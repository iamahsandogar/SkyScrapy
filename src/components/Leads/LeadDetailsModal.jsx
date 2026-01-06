import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
function LeadDetailsModal({ open, onClose, lead, getEmployeeName, getStatusName }) {
  if (!lead) return null;
  
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  // Helper to get field value handling both camelCase and snake_case
  const getField = (camelCase, snakeCase) => {
    return lead[snakeCase] || lead[camelCase] || "-";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Lead Details</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography>
            <strong>Lead Title:</strong> {getField("title", "title")}
          </Typography>
          <Typography>
            <strong>First Name:</strong> {getField("firstName", "contact_first_name")}
          </Typography>
          <Typography>
            <strong>Last Name:</strong> {getField("lastName", "contact_last_name")}
          </Typography>
          <Typography>
            <strong>Email:</strong> {getField("email", "contact_email")}
          </Typography>
          <Typography>
            <strong>Phone:</strong> {getField("phone", "contact_phone")}
          </Typography>
          <Typography>
            <strong>LinkedIn:</strong> {getField("linkedIn", "contact_linkedin_url")}
          </Typography>
          <Typography>
            <strong>Status:</strong> {getStatusName ? getStatusName(lead.status) : (lead.status || "-")}
          </Typography>
          <Typography>
            <strong>Assigned To:</strong> {getEmployeeName ? getEmployeeName(lead.assigned_to || lead.assignedTo) : "-"}
          </Typography>
          <Typography>
            <strong>Follow-up Date:</strong> {formatDate(lead.follow_up_at || lead.followUpAt)}
          </Typography>
          <Typography>
            <strong>Follow-up Time:</strong> {(() => {
              const time = lead.follow_up_time || lead.followUpTime;
              if (!time) return "-";
              if (typeof time === 'string') return time;
              return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            })()}
          </Typography>
          <Typography>
            <strong>Follow-up Status:</strong> {getField("followupStatus", "follow_up_status")}
          </Typography>
          <Typography>
            <strong>Source:</strong> {getField("source", "source")}
          </Typography>
          <Typography>
            <strong>Company:</strong> {getField("company", "company_name")}
          </Typography>
          <Typography>
            <strong>Position Title:</strong> {getField("positionTitle", "contact_position_title")}
          </Typography>
          <Typography>
            <strong>Description:</strong> {getField("description", "description")}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LeadDetailsModal;
