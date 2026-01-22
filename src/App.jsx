import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";
import UserProtectedRoute from "./routes/UserProtectedRoute";
import AdminRoute from "./routes/AdminRoute";

// User Pages
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import Profile from "./pages/Profile";
import Login from "./pages/Login";

// Admin Components
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBookings from "./pages/admin/Bookings";
import AdminServices from "./pages/admin/Services";
import AdminUsers from "./pages/admin/Users";
import AdminPromotions from "./pages/admin/Promotions";

export default function App() {
  return (
    <Routes>
      {/* --- Auth Routes --- */}
      <Route path="/login" element={<Login />} />

      {/* --- User Routes (ลูกค้า) --- */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        
        {/* หน้า Booking เปิดให้ทุกคนเข้าดูได้ (เช็ค Login ตอนกดปุ่มจอง) */}
        <Route path="/booking" element={<Booking />} />

        {/* หน้า Profile ต้องล็อกอินก่อนถึงจะเข้าได้ */}
        <Route
          path="/profile"
          element={
            <UserProtectedRoute>
              <Profile />
            </UserProtectedRoute>
          }
        />
      </Route>

      {/* --- Admin Routes (หลังบ้าน) --- */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        {/* เมื่อเข้า /admin เฉยๆ ให้เด้งไปหน้า dashboard */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="promotions" element={<AdminPromotions />} />
      </Route>

      {/* Catch-all route: ถ้าพิมพ์ URL ผิด ให้กลับไปหน้าแรก */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}