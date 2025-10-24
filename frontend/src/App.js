import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import ParentDashboard from "@/pages/ParentDashboard";
import StudentManagement from "@/pages/StudentManagement";
import AttendanceScanner from "@/pages/AttendanceScanner";
import AttendanceHistory from "@/pages/AttendanceHistory";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                user.role === "admin" ? (
                  <Navigate to="/admin" />
                ) : user.role === "teacher" ? (
                  <Navigate to="/teacher" />
                ) : user.role === "parent" ? (
                  <Navigate to="/parent" />
                ) : (
                  <Navigate to="/login" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/login"
            element={<Login onLogin={handleLogin} />}
          />
          <Route
            path="/admin"
            element={
              user && user.role === "admin" ? (
                <AdminDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/teacher"
            element={
              user && user.role === "teacher" ? (
                <TeacherDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/parent"
            element={
              user && user.role === "parent" ? (
                <ParentDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/students"
            element={
              user && (user.role === "admin" || user.role === "teacher") ? (
                <StudentManagement user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/scanner"
            element={
              user && (user.role === "admin" || user.role === "teacher") ? (
                <AttendanceScanner user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/attendance"
            element={
              user ? (
                <AttendanceHistory user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;