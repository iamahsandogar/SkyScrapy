import { Box, Typography, Modal, Chip, Button } from "@mui/material";
import { colors } from "../../design-system/tokens";

export default function ProjectDetailsModal({
  open,
  onClose,
  project,
  getEmployeeName,
}) {
  if (!project) return null;

  const getChipStyles = (status) => {
    switch (status) {
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
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          width: 400,
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {project.title}
        </Typography>
        <Typography mb={1}>
          Description: {project.description || "-"}
        </Typography>
        <Typography mb={1}>
          Assigned To: {getEmployeeName(project.assignedTo)}
        </Typography>
        <Chip label={project.status} sx={getChipStyles(project.status)} />
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
