import React from "react";
import { Box } from "@mui/material";
import { ScaleLoader } from "react-spinners";

export default function Loading() {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <ScaleLoader color="#3558BE" height={50} width={8} />
    </Box>
  );
}
