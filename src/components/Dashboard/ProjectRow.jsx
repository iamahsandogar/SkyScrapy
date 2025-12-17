import { Box, Typography } from "@mui/material";

export default function ProjectRow({ title, status }) {
  const statusColor = {
    "On Track": "#E7F5EE",
    "At Risk": "#FFF4E8",
    "Off Track": "#FDE2E2",
  };
  return (
    <Box
      sx={{
        p: 1,
        display: "flex",
        justifyContent: "space-between",
        borderRadius: 2,
        bgcolor: statusColor[status],
      }}
    >
      <Typography>{title}</Typography>
      <Typography fontWeight="bold">{status}</Typography>
    </Box>
  );
}
