import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const AuthGuard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = localStorage.getItem("user");
      const isAuth = localStorage.getItem("isAuth") === "true";

      if (!user || !isAuth) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Optionally verify token by calling a protected endpoint
      // Or just trust localStorage if cookies are set
      // For now, we'll trust localStorage since cookies are HTTP-only
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    // Show loading spinner
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AuthGuard;
