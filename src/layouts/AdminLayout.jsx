import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, Scissors, Users,
  Ticket, LogOut, Menu, X, Settings, CalendarX, MessageSquare
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const { logout, isAdmin } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "ภาพรวม (Dashboard)", path: "/admin/dashboard" },
    { icon: CalendarDays, label: "จัดการการจอง", path: "/admin/bookings" },
    { icon: CalendarX, label: "จัดการวันหยุดร้าน", path: "/admin/holidays" },
    { icon: Scissors, label: "จัดการบริการ", path: "/admin/services" },
    { icon: Users, label: "ลูกค้าสมาชิก", path: "/admin/users" },
    { icon: Ticket, label: "โปรโมชั่น", path: "/admin/promotions" },
    { icon: MessageSquare, label: "จัดการความเห็น", path: "/admin/comments" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex selection:bg-amber-500 selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Manrope:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-num { font-family: 'Prompt', sans-serif; }
      `}</style>

      {/* --- MOBILE SIDEBAR OVERLAY --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-white/10 flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Link to="/admin/dashboard" className="flex items-center gap-2 font-serif font-bold text-xl text-white">
            <Scissors className="text-amber-500" />
            <span>Admin Panel</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-zinc-400">
            <X />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                 flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                 ${isActive
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"}
               `}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-medium text-sm"
          >
            <LogOut size={20} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Bar (Mobile Toggle) */}
        <header className="h-16 lg:hidden flex items-center px-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-zinc-400">
            <Menu />
          </button>
          <span className="ml-4 font-serif font-bold text-white">Dashboard</span>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-xs rounded-3xl border border-white/10 shadow-2xl p-8 text-center animate-[slideUp_0.3s_ease-out]">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">ยืนยันการออกจากระบบ</h4>
            <p className="text-zinc-400 text-sm mb-8">คุณต้องการออกจากหน้าแอดมินใช่หรือไม่?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}