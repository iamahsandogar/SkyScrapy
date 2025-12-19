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
function LeadDetailsModal({ open, onClose, lead, getEmployeeName }) {
  if (!lead) return null;
  const formatDate = (date) => {
    date ? new Date(date).toLocaleDateString() : "-";
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Lead Details</DialogTitle>
      <DialogContent dividers>
        <Box display flexDirection="column" gap={1}>
          <Typography>
            <strong>Lead Title:</strong> {lead.title || "-"}
          </Typography>
          <Typography>
            <strong>First Name:</strong> {lead.firstName || "-"}
          </Typography>
          <Typography>
            <strong>Last Name:</strong> {lead.lastName || "-"}
          </Typography>
          <Typography>
            <strong>Email:</strong> {lead.email || "-"}
          </Typography>
          <Typography>
            <strong>Phone:</strong> {lead.phone || "-"}
          </Typography>
          <Typography>
            <strong>LinkedIn:</strong> {lead.linkedIn || "-"}
          </Typography>
          <Typography>
            <strong>Status:</strong> {lead.status || "-"}
          </Typography>
          <Typography>
            <strong>Assigned To:</strong> {getEmployeeName(lead.assignedTo)}
          </Typography>
          <Typography>
            <strong>Follow-up At:</strong> {formatDate(lead.followUpAt)}
          </Typography>
          <Typography>
            <strong>Follow-up Status:</strong> {lead.followupStatus || "-"}
          </Typography>
          <Typography>
            <strong>Source:</strong> {lead.source || "-"}
          </Typography>
          <Typography>
            <strong>Company:</strong> {lead.company || "-"}
          </Typography>
          <Typography>
            <strong>Position Title:</strong> {lead.positionTitle || "-"}
          </Typography>
          <Typography>
            <strong>Description:</strong> {lead.description || "-"}
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
