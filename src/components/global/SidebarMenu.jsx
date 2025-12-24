import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
  Avatar,
  Chip,
} from "@mui/material";
import { dividerClasses } from "@mui/material/Divider";

import { useState } from "react";
import * as Icons from "@mui/icons-material";
import { sidebarMenu } from "../../data/sidebarMenu";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { colors } from "../../design-system/tokens";
export default function SidebarMenu({ user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState({});

  const toggle = (index) =>
    setOpen((prev) => ({ ...prev, [index]: !prev[index] }));

  const handleLogout = async () => {
    try {
      const response = await authAPI.logout();
      if (response) {
        localStorage.removeItem("user");
        localStorage.removeItem("isAuth");
        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Box
      sx={{
        p: 1,
        width: "100%",
        height: "100%",
      }}
    >
      <List
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          color: colors.grey[100],
          rowGap: 1,
          overflow: "hidden",
        }}
      >
        {/* LOGO */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pb: 2,
            borderBottom: `1px solid ${colors.grey[800]}`,
          }}
        >
          <img
            src="/SLCW Icon.png"
            alt="SLCW Icon"
            style={{ width: "35px", height: "35px", objectFit: "contain" }}
          />
          <Typography
            variant="h1"
            fontWeight={"bold"}
            lineHeight={1}
            fontSize={25}
          >
            SLCW CRM
          </Typography>
        </Box>

        {/* SIDEBAR MENU */}
        <Box 
          sx={{ 
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {sidebarMenu.map((item, index) => {
            if (item.type === "divider")
              return <Divider key={index} sx={{ my: 0.5 }} />;

            const Icon = item.icon ? Icons[item.icon] : null;
            const hasChildren = Boolean(item.children);

            return (
              <Box key={item.label} sx={{ display: "flex", flexDirection: "column" }}>
                {/* PARENT ITEM */}
                <ListItemButton
                  onClick={() => {
                    if (hasChildren) {
                      toggle(index);
                      return;
                    }
                    navigate(item.path);
                  }}
                  sx={{
                    pl: 1,
                    py: 0.75,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                    display: "flex",
                    gap: 1,
                    
                    minHeight: 40,
                  }}
                >
                  {Icon && (
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icon
                        fontSize="small"
                        color={item.danger ? "error" : "inherit"}
                      />
                    </ListItemIcon>
                  )}

                  <ListItemText 
                    primary={item.label}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontSize: "15px",
                      },
                    }}
                  />

                  {hasChildren &&
                    (open[index] ? (
                      <Icons.ExpandLess fontSize="small" />
                    ) : (
                      <Icons.ExpandMore fontSize="small" />
                    ))}
                </ListItemButton>

                {/* CHILDREN ITEMS */}
                {hasChildren && (
                  <Collapse in={open[index]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ py: 0.5 }}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon ? Icons[child.icon] : null;

                        return (
                          <ListItemButton
                            key={child.label}
                            onClick={() => navigate(child.path)}
                            sx={{
                              pl: 3,
                              py: 0.5,
                              borderRadius: 1,
                              "&:hover": { bgcolor: "action.hover" },
                              minHeight: 36,
                            }}
                          >
                            {ChildIcon && (
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <ChildIcon fontSize="small" />
                              </ListItemIcon>
                            )}

                            <ListItemText
                              primary={child.label}
                              sx={{
                                "& .MuiListItemText-primary": {
                                  fontSize: 14,
                                },
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </Box>

        {/* USER PROFILE & LOGOUT */}
        <Box sx={{ mt: "auto", pt: 2, borderTop: `1px solid ${colors.grey[800]}` }}>
          {/* USER PROFILE */}
          {user && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                mb: 1.5,
                borderRadius: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: colors.blueAccent[700],
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {user.name
                  ? user.name.charAt(0).toUpperCase()
                  : user.first_name
                  ? user.first_name.charAt(0).toUpperCase()
                  : user.email
                  ? user.email.charAt(0).toUpperCase()
                  : "G"}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight="600"
                  sx={{
                    color: colors.grey[100],
                    fontSize: "14px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name ||
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.email ||
                    "Guest"}
                </Typography>
                <Chip
                  label={
                    user.is_staff || user.is_admin || user.is_superuser
                      ? "Admin"
                      : user.role === 0 || user.role === "0"
                      ? "Admin"
                      : "Employee"
                  }
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "11px",
                    fontWeight: "600",
                    bgcolor:
                      user.is_staff || user.is_admin || user.is_superuser
                        ? colors.blueAccent[600]
                        : user.role === 0 || user.role === "0"
                        ? colors.blueAccent[600]
                        : colors.grey[700],
                    color: colors.grey[100],
                    mt: 0.5,
                  }}
                />
              </Box>
            </Box>
          )}

          {/* LOGOUT */}
          <ListItemButton
            sx={{ color: colors.redAccent[500] }}
            onClick={handleLogout}
          >
            <ListItemIcon sx={{ color: colors.redAccent[500] }}>
              <Icons.LogoutRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </Box>
      </List>
    </Box>
  );
}
