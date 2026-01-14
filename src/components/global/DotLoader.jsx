import { Box } from "@mui/material";

export default function DotLoader({
  size = 40,
  color = "#5BB0FF",
  dotCount = 12,
}) {
  const dots = Array.from({ length: dotCount });
  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        "@keyframes loaderPulse": {
          "0%": { opacity: 0.2 },
          "50%": { opacity: 1 },
          "100%": { opacity: 0.2 },
        },
      }}
    >
      {dots.map((_, index) => {
        const angle = (360 / dotCount) * index;
        const radius = size / 2.4;
        return (
          <Box
            component="span"
            key={index}
            sx={{
              position: "absolute",
              width: size * 0.16,
              height: size * 0.16,
              borderRadius: "50%",
              backgroundColor: color,
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${angle}deg) translate(0, -${radius}px)`,
              animation: "loaderPulse 1.1s ease-in-out infinite",
              animationDelay: `${(index * 0.08).toFixed(2)}s`,
            }}
          />
        );
      })}
    </Box>
  );
}
