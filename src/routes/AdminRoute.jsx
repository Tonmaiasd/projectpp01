import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// Admin-only route protection
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useContext(AuthContext);

  // ถ้ายังกำลังโหลด
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-zinc-400">กำลังโหลด...</div>
    </div>;
  }

  // ถ้ายังไม่ล็อกอิน ให้ส่งไปหน้า login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ถ้าไม่ใช่ admin ให้ส่งไปหน้า home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // ถ้าเป็น admin แล้ว → แสดง Component
  return children;
};

export default AdminRoute;
