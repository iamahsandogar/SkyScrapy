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

import { colors } from "../../design-system/tokens/index";

import { useState } from "react";
import * as Icons from "@mui/icons-material";
import { sidebarMenu } from "../../data/sidebarMenu";
import { useNavigate } from "react-router-dom";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState({});

  const toggle = (index) =>
    setOpen((prev) => ({ ...prev, [index]: !prev[index] }));

  return (
    <Box
      sx={{
        p: 1,
        width: "100%",
        height: "100%",
        // "& .MuiDrawer-paper": {
        //   width: 240,
        //   p: "8px",
        //   border: `1px solid ${colors.grey[900]}`,
        //   borderRadius: "12px",
        //   margin: "8px",
        // },
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

        <Box sx={{ flexGrow: 1 }}>
          {sidebarMenu.map((item, index) => {
            if (item.type === "divider")
              return <Divider key={index} sx={{ my: 1 }} />;

            const Icon = item.icon ? Icons[item.icon] : null;
            const hasChildren = Boolean(item.children);

            return (
              <div key={item.label}>
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

                {/*============== CHILDREN =================*/}
                {hasChildren && (
                  <Collapse in={open[index]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.children.map((child) => (
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
                          {Icon && (
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Icon
                                fontSize="small"
                                color={item.danger ? "error" : "inherit"}
                              />
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={child.label}
                            sx={{
                              "& .MuiListItemText-primary": { fontSize: 14 },
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </div>
            );
          })}
        </Box>

        <Box>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icons.Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
          <ListItemButton
            sx={{ color: colors.redAccent[500] }}
            onClick={() => {
              // Clear auth token/session if any
              localStorage.removeItem("authToken"); // optional
              navigate("/login"); // navigate to Login screen
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: colors.redAccent[500] }}>
              <Icons.LogoutRounded fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </Box>
      </List>
    </Box>
  );
}
