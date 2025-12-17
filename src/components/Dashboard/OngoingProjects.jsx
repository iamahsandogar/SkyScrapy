import React from "react";
import { ongoingProjects } from "../../data/dashboardData";
import { Box, Card, CardContent, Typography, Stack } from "@mui/material";
import ProjectRow from "./ProjectRow";

function OngoingProjects() {
  return (
    <Card
      sx={{
        borderRadius: "12px",
        padding: 4,
        backgroundColor: "#fff",
        height: "350px",
        boxShadow: "none",
      }}
    >
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Typography fontWeight="bold">Ongoing Projects</Typography>

        {/* Scrollable projects list */}
        <Stack
          spacing={2}
          mt={2}
          sx={{
            flex: 1, // takes available space
            overflowY: "auto", // ONLY this scrolls
            pr: 1, // prevents scrollbar overlap
          }}
        >
          {ongoingProjects.map((p) => (
            <ProjectRow key={p.id} {...p} />
          ))}
        </Stack>

        {/* Fixed bottom action */}
        <Box mt={2}>
          <Typography
            component="a"
            href="/management/projects"
            sx={{
              color: "#1152C2",
              textDecoration: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            All Projects →
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default OngoingProjects;
