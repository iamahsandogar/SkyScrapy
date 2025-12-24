import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  InputBase,
  IconButton,
  Typography,
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
          rowGap: 2,
        }}
      >
        {/* LOGO & EMPLOYEE DETAILS */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            pb: 2,
            borderBottom: `1px solid ${colors.grey[800]}`,
          }}
        >
          {/* LOGO */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
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

          {/* EMPLOYEE DETAILS */}
          {user && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: colors.grey[800],
              }}
            >
              <Typography
                variant="body2"
                fontWeight="bold"
                sx={{ color: colors.grey[300], mb: 0.5 }}
              >
                Employee Detail
              </Typography>
              <Typography
                variant="body1"
                fontWeight="600"
                sx={{ color: colors.grey[100] }}
              >
                {user.name || 
                 `${user.first_name || ""} ${user.last_name || ""}`.trim() || 
                 user.email || 
                 "Guest"}
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: colors.blueAccent[300],
                    fontWeight: "500",
                    fontSize: "12px",
                  }}
                >
                  {user.is_staff || user.is_admin || user.is_superuser
                    ? "Admin"
                    : user.role === "admin" || user.role === "Admin"
                    ? "Admin"
                    : "Employee"}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* SEARCH */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: `1px solid ${colors.grey[700]}`,
              borderRadius: 10,
            }}
          >
            <IconButton>
              <Icons.SearchRounded />
            </IconButton>
            <InputBase placeholder="Search" />
          </Box>
        </Box>
        {/* SIDEBAR MENU */}
        <Box sx={{ flexGrow: 1 }}>
          {sidebarMenu.map((item, index) => {
            if (item.type === "divider")
              return <Divider key={index} sx={{ my: 1 }} />;

            const Icon = item.icon ? Icons[item.icon] : null;
            const hasChildren = Boolean(item.children);

            return (
              <div key={item.label}>
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
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                    display: "flex",
                    gap: 1,
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

                  <ListItemText primary={item.label} />

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
                    <List component="div" disablePadding>
                      {item.children.map((child) => {
                        // 🔴 CHANGED: Resolve child icon separately
                        const ChildIcon = child.icon ? Icons[child.icon] : null;

                        return (
                          <ListItemButton
                            key={child.label}
                            onClick={() => navigate(child.path)}
                            sx={{
                              pl: 3,
                              mt: 0.5,
                              borderRadius: 1,
                              "&:hover": { bgcolor: "action.hover" },
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
              </div>
            );
          })}
        </Box>

        {/* LOGOUT */}
        <Box>
          <Box
            sx={{
              height: "1px",
              backgroundImage:
                "repeating-linear-gradient(to right, grey 0, grey 2px, transparent 2px, transparent 6px)",
              mb: 1,
            }}
          />
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
