import React from "react";
import { Card, CardContent, Typography, Box, Divider } from "@mui/material";

import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";
const data = [
  { name: "New", value: 52.1, color: "#F4C87A" },
  { name: "Contacted", value: 22.8, color: "#79B5F2" },
  { name: "Negotiation", value: 13.9, color: "#8BD5A1" },
  { name: "Closed", value: 11.2, color: "#E78888" },
];

const ChartBox = () => {
  return (
    <Card
      sx={{
        boxShadow: "none",
        borderRadius: "12px",
        padding: 4,
        backgroundColor: "#fff",
        width: "100%",
        height: "350px",
      }}
    >
      {/* Title */}
      <CardContent
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Typography fontWeight="bold">Lead Status Breakdown</Typography>

        {/* Chart row */}
        <Box
          spacing={2}
          mt={2}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 200,
            overflowY: "auto",
          }}
        >
          {/* Pie Chart */}
          <Box sx={{ width: "55%", height: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((item, index) => (
                    <Cell key={index} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          {/* Percentages List */}
          <Box sx={{ width: "45%" }}>
            {data.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontSize: "15px" }}>{item.name}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{item.value}%</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChartBox;
