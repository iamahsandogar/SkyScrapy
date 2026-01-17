import { Box, Card, Skeleton } from "@mui/material";

export default function KanbanCardSkeleton() {
  return (
    <Card
      sx={{
        mb: 1.5,
        p: 1.5,
        boxShadow: 2,
      }}
    >
      {/* Title */}
      <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
      
      {/* Assigned to */}
      <Skeleton variant="text" width="50%" height={16} sx={{ mb: 0.5 }} />
      
      {/* Follow-up date */}
      <Skeleton variant="text" width="70%" height={16} sx={{ mb: 0.5 }} />
      
      {/* Status chip */}
      <Box display="flex" gap={0.5} mt={0.5} mb={0.5}>
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={50} height={24} />
      </Box>
      
      {/* Button */}
      <Skeleton variant="rounded" width="100%" height={30} sx={{ mt: 1 }} />
    </Card>
  );
}
