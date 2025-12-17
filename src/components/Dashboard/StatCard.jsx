import { Card, CardContent, Typography, Box } from "@mui/material";
import MovingIcon from "@mui/icons-material/Moving";

export default function StatCard({ title, value, trend, bgcolor }) {
  const isPositive = trend.startsWith("+");

  return (
    <Card
      sx={{
        width: "100%", // important to fill the Grid item
        backgroundColor: bgcolor,
        borderRadius: "12px",
        boxShadow: "none",
      }}
    >
      <CardContent>
        <Typography variant="subtitle1" mb={1}>
          {title}
        </Typography>

        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" mb={1}>
            {value}
          </Typography>

          {/* Trend Row */}
          <Box display="flex" alignItems="center" gap={1}>
            <MovingIcon
              sx={{
                color: isPositive ? "green" : "red",
                fontSize: 22,
                transform: isPositive ? "none" : "rotate(180deg)",
                transition: "0.3s",
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: isPositive ? "green" : "red" }}
            >
              {trend}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
