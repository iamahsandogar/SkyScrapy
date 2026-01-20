import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { colors } from "../../design-system/tokens";

export default function ProjectDetailsModal({
  open,
  onClose,
  project,
  getEmployeeName,
}) {
  if (!project) return null;

  const getStatusLabel = (status) => {
    if (!status) return "Unknown";
    if (typeof status === "object" && status.name) {
      return status.name;
    }
    return status;
  };

  const getChipStyles = (status) => {
    const statusName = getStatusLabel(status);
    switch (statusName) {
      case "Completed":
        return {
          backgroundColor: colors.greenAccent[700],
          color: colors.greenAccent[300],
        };
      case "Pending":
        return {
          backgroundColor: colors.yellowAccent[700],
          color: colors.yellowAccent[300],
        };
      case "In Progress":
        return {
          backgroundColor: colors.blueAccent[700],
          color: colors.blueAccent[300],
        };
      case "Rejected":
        return {
          backgroundColor: colors.redAccent[700],
          color: colors.redAccent[300],
        };
      default:
        return { backgroundColor: colors.grey[700], color: colors.grey[300] };
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Project Details</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          <Typography>
            <strong>Project Title:</strong> {project.title || "-"}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Typography>
              <strong>Status:</strong>
            </Typography>
            <Chip 
              label={getStatusLabel(project.status)} 
              size="small"
              sx={getChipStyles(project.status)} 
            />
          </Box>

          <Typography>
            <strong>Assigned To:</strong> {getEmployeeName(project)}
          </Typography>

          <Typography>
            <strong>Description:</strong> {project.description || "-"}
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
