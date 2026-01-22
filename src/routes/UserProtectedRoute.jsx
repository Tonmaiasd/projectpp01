import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// General user route protection
const UserProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  // ถ้ายังกำลังโหลดข้อมูลผู้ใช้
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">กำลังโหลด...</div>
      </div>
    );
  }

  // ถ้าโหลดเสร็จแล้ว แต่ไม่ได้ล็อกอิน ให้ส่งไปหน้า login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ถ้าล็อกอินแล้ว → แสดง Component ที่ต้องการได้เลย
  return children;
};

export default UserProtectedRoute;
