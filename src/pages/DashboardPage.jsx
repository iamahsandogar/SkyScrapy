import { Box, Typography, Button } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import AddIcon from "@mui/icons-material/Add";
import StatCard from "../components/Dashboard/StatCard";
import Topbar from "../components/global/Topbar";
import { stats } from "../data/dashboardData";
import UpcomingReminders from "../components/Dashboard/UpcomingReminders";
import QuickActions from "../components/Dashboard/QuickActions";
import ActiveLeads from "../components/Dashboard/ActiveLeads";
import LeadNotesPanel from "../components/Dashboard/LeadNotesPanel";
import OngoingProjects from "../components/Dashboard/OngoingProjects";
import ChartBox from "../components/Dashboard/ChartBox";
import { useNavigate } from "react-router-dom";
import ProjectCompletionTable from "../components/Dashboard/ProjectCompletionChart";
import Cards from "../components/Dashboard/Cards";

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <Box>
      {/* Dashboard Header */}
      <Topbar>
        <Typography variant="h5" fontWeight="bold">
          Dashboard
        </Typography>

        {/* Bell + Button + Graph */}
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "9px",
              textTransform: "none",
              fontWeight: "bold",
            }}
            onClick={() => navigate("/create-lead")}
          >
            Add New Lead
          </Button>
        </Box>
      </Topbar>
      {/* Stat Cards - Full Row */}
      {/* xs=12 -> full width on mobile, sm=6 -> two per row on tablet, md=3 -> four per row on desktop */}
      {/* <Box
        display={"grid"}
        gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
        gap={2}
        mt={2}
      >
        {stats.map((stat, index) => (
          <Box key={index}>
            <StatCard {...stat} />
          </Box>
        ))}
      </Box> */}
      <Cards />
      {/* Ongoing Projects + Chart */}
      <Box display={"grid"} gridTemplateColumns="1fr 1fr" gap={2} mt={2}>
        <ProjectCompletionTable />
      </Box>
      <Box
        display="grid"
        gap={2}
        mt={2}
        sx={{
          gridTemplateColumns: {
            xs: "1fr", // Mobile → 1 column
            sm: "1fr", // Small tablets → 1 column
            md: "1fr 1fr", // Desktop → 2 columns
          },
        }}
      >
        <OngoingProjects />
        <ChartBox />
      </Box>
      {/* Next row with 4 small cards */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <QuickActions />
        <UpcomingReminders />
        <ActiveLeads />
        <LeadNotesPanel />
      </Box>
    </Box>
  );
}
