import { Navigate } from "react-router-dom";

// รับ prop children เข้ามาเพื่อแสดงผลไส้ใน (เช่น <Booking />)
const ProtectedRoute = ({ children }) => {
  // 1. ตรวจสอบสถานะการล็อกอิน
  // เปลี่ยน logic ตรงนี้ตามวิธีเก็บ token ของคุณ (เช่น localStorage, cookie, หรือ Context)
  // ตัวอย่าง: ถ้ามี token ใน localStorage ถือว่าล็อกอินแล้ว
  const isAuthenticated = localStorage.getItem("token"); 

  // 2. ถ้ายังไม่ล็อกอิน -> ดีดกลับไปหน้า Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. ถ้าล็อกอินแล้ว -> แสดง Component ที่ถูกห่อไว้ (children)
  return children;
};

export default ProtectedRoute;