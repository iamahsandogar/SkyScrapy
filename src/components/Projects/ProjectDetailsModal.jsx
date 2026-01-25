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
import { FaLinkedin } from "react-icons/fa";
import LeadNotesChat from "../Leads/LeadNotesChat";

export default function ProjectDetailsModal({ open, onClose, project, getEmployeeName }) {
  if (!project) return null;

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    } catch (error) {
      return "-";
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "-";
      const dateStr = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `${dateStr}, ${timeStr}`;
    } catch (e) {
      return "-";
    }
  };

  const getField = (camelCase, snakeCase) => {
    const value = project[snakeCase] || project[camelCase];
    if (value === null || value === undefined || value === "") return "-";
    return value;
  };

  const linkedInUrl = project.contact_linkedin_url || project.linkedIn || "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Project Details</DialogTitle>
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
            <strong>LinkedIn:</strong>{" "}
            {linkedInUrl ? (
              <a href={linkedInUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#0A66C2" }}>
                <FaLinkedin size={18} />
              </a>
            ) : (
              "-"
            )}
          </Typography>
          <Typography>
            <strong>Status:</strong> {project.status?.name || project.status || "-"}
          </Typography>

          <Typography>
            <strong>Assigned To:</strong>{" "}
            {getEmployeeName ? getEmployeeName(project.assigned_to || project.assignedTo) : "-"}
          </Typography>
          <Typography>
            <strong>Follow-up At:</strong> {formatDateTime(project.follow_up_at || project.followUpAt)}
          </Typography>
          <Typography>
            <strong>Follow-up Status:</strong> {getField("followupStatus", "follow_up_status")}
          </Typography>
          <Typography>
            <strong>Source:</strong> {getField("source", "source")}
          </Typography>
          <Typography>
            <strong>Lifecycle:</strong> {getField("lifecycle", "lifecycle")}
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
        {/* keep notes chat available if needed */}
        {/* <Box mt={4}>
          <LeadNotesChat leadId={project.id || project.pk || project.uuid} />
        </Box> */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
