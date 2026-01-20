import { lazy, Suspense } from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { getColors } from "../../design-system/tokens";
import { useTheme } from "../../contexts/ThemeContext";
import DotLoader from "../global/DotLoader";

// Lazy load the ChartBoxContent component
const LazyChartBoxContent = lazy(() => import("./ChartBoxContent"));

function ChartBoxFallback() {
  const { mode } = useTheme();
  const colors = getColors(mode);
  const cardBackground = mode === "dark" ? colors.primary[500] : colors.bg[100];
  const subTextColor = mode === "dark" ? colors.grey[200] : colors.primary[200];

  return (
    <Card
      sx={{
        boxShadow: "none",
        borderRadius: "12px",
        padding: 4,
        backgroundColor: cardBackground,
        width: "100%",
      }}
    >
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}
      >
        <Typography fontWeight="bold" mb={2}>Lead Status Breakdown</Typography>
        <DotLoader />
        <Typography sx={{ color: subTextColor, mt: 2 }}>Loading status data...</Typography>
      </CardContent>
    </Card>
  );
}

export default function ChartBox({ data }) {
  return (
    <Suspense fallback={<ChartBoxFallback />}>
      <LazyChartBoxContent data={data} />
    </Suspense>
  );
}
