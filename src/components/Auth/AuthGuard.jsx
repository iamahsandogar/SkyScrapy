import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AuthGuard = () => {
  const isAuth = localStorage.getItem("isAuth") === "true";

  // If not authenticated, redirect to login
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AuthGuard;
