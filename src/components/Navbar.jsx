import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Scissors, Menu, X } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase/client";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const { user, logout, loading } = useContext(AuthContext);

  const isAuth = !!user;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ดึงข้อมูล profile เมื่อ user login
  useEffect(() => {
    if (!user) { setUserProfile(null); return; }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  const displayName = userProfile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const avatarUrl = userProfile?.avatar_url || '/default-avatar.png';

  const [showManual, setShowManual] = useState(false);

  const openManual = () => setShowManual(true);
  const closeManual = () => setShowManual(false);

  // paths to images located in public/picformanual
  const manualImages = [
    "/picformanual/1.jpg",
    "/picformanual/2.jpg",
    "/picformanual/3.jpg",
    "/picformanual/4.jpg",
    "/picformanual/5.jpg",
    "/picformanual/6.jpg",
    "/picformanual/7.jpg",
    "/picformanual/8.jpg",
    "/picformanual/9.jpg",
  ];

  const navItems = [
    { label: "หน้าแรก", link: "/" },
    { label: "จองคิว/บริการ", link: "/booking" },
    { label: "ข้อมูลส่วนตัว", link: "/profile" },
    // manual button will open popup instead of navigating
    { label: "คู่มือการใช้งาน", onClick: openManual },
  ];

  // carousel state for manual images
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!showManual) return;
    const timer = setInterval(() => {
      setCurrentIdx((idx) => (idx + 1) % manualImages.length);
    }, 15000); // advance every 10 seconds
    return () => clearInterval(timer);
  }, [showManual]);

  const renderAuthButton = () => {
    if (loading) {
      return (
        <div className="w-30 h-12 bg-zinc-800 rounded-full animate-pulse" />
      );
    }
    if (isAuth) {
      return (
        <button
          onClick={handleLogout}
          className="relative px-7 py-3 bg-red-600/90 text-white text-sm font-bold tracking-wider rounded-full overflow-hidden group shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="relative z-10 flex items-center gap-2">ออกจากระบบ</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => navigate("/login")}
        className="relative px-7 py-3 bg-amber-500 text-black text-sm font-bold tracking-wider rounded-full overflow-hidden group shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
      >
        <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out"></div>
        <span className="relative z-10 flex items-center gap-2">เข้าสู่ระบบ</span>
      </button>
    );
  };

  const renderMobileAuthButton = () => {
    if (loading) {
      return (
        <div className="w-48 h-12 bg-zinc-800 rounded-lg animate-pulse" />
      );
    }
    if (isAuth) {
      return (
        <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="text-3xl font-thai font-bold transition-colors cursor-pointer text-red-500 hover:text-red-400">
          ออกจากระบบ
        </button>
      );
    }
    return (
      <NavLink to="/login" onClick={() => setMenuOpen(false)} className="text-3xl font-thai font-bold transition-colors cursor-pointer text-amber-500 hover:text-amber-400">
        เข้าสู่ระบบ
      </NavLink>
    );
  };

  return (
    <>
      <nav
        className={`sticky top-0 w-full z-50 transition-all duration-500  bg-black`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center">

            <NavLink to="/" className="flex items-center gap-2 sm:gap-4 group cursor-pointer z-50 relative shrink-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] group-hover:scale-105 transition-all duration-500">
                <Scissors fill="currentColor" className="w-5 h-5 sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-[1.1rem] sm:text-2xl lg:text-3xl font-bold font-serif tracking-widest text-white leading-none group-hover:text-amber-400 transition-colors duration-300 whitespace-nowrap">
                  LOR LOEI CUTS
                </h1>
                <p className="text-[8px] sm:text-[11px] font-medium text-amber-500/80 uppercase tracking-widest sm:tracking-[0.3em] mt-1 group-hover:text-amber-400 transition-colors font-thai">
                  หล่อเลย คัทซ์
                </p>
              </div>
            </NavLink>

            <div className="hidden lg:flex items-center gap-4 font-thai">
              <div className="flex items-center gap-1 bg-black/20 backdrop-blur-2xl px-2 py-2 rounded-full border border-white/10 shadow-2xl shadow-black/10 ring-1 ring-white/5">
                {navItems.map((item, idx) => {
                  // if manual item, render button
                  if (item.onClick) {
                    return (
                      <button
                        key={idx}
                        onClick={item.onClick}
                        className="relative px-5 py-2 text-sm font-medium transition-all duration-300 uppercase tracking-wider group overflow-hidden rounded-full hover:bg-white/5 cursor-pointer text-zinc-400 hover:text-white"
                      >
                        <span className="relative z-10">{item.label}</span>
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={item.link}
                      to={item.link}
                      className={({ isActive }) => `
                            relative px-5 py-2 text-sm font-medium transition-all duration-300 uppercase tracking-wider group overflow-hidden rounded-full hover:bg-white/5 cursor-pointer
                            ${isActive ? "text-white" : "text-zinc-400 hover:text-white"}
                        `}
                    >
                      <span className="relative z-10">{item.label}</span>
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"></span>
                    </NavLink>
                  );
                })}
              </div>

              {/* User Profile Display */}
              {isAuth && !loading && (
                <NavLink
                  to="/profile"
                  className="flex items-center gap-2.5 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full hover:border-amber-500/40 transition-all duration-300 group"
                >
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/30 group-hover:border-amber-500/70 transition-all"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  />
                  <span className="text-sm font-bold text-white max-w-[100px] truncate group-hover:text-amber-400 transition-colors">
                    {displayName}
                  </span>
                </NavLink>
              )}

              {renderAuthButton()}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 lg:hidden z-50">
              {isAuth && !loading && (
                <NavLink
                  to="/profile"
                  className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 px-2 py-1 rounded-full transition-all duration-300 shrink-0"
                  onClick={() => setMenuOpen(false)}
                >
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-amber-500/50"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  />
                  <span className="hidden min-[380px]:block text-xs font-bold text-white max-w-[50px] sm:max-w-[70px] truncate">
                    {displayName}
                  </span>
                </NavLink>
              )}
              <button className="text-white active:scale-95 transition-transform shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X size={28} className="text-amber-500 sm:w-8 sm:h-8" /> : <Menu size={28} className="sm:w-8 sm:h-8" />}
              </button>
            </div>
          </div>
        </div>

        <div className={`fixed inset-0 bg-zinc-950/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center space-y-8 transition-all duration-500 lg:hidden ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
          {navItems.map((item, idx) => {
            if (item.onClick) {
              return (
                <button
                  key={idx}
                  onClick={() => { setMenuOpen(false); item.onClick(); }}
                  className="text-3xl font-thai font-bold transition-colors cursor-pointer text-white hover:text-amber-500"
                >
                  {item.label}
                </button>
              );
            }
            return (
              <NavLink
                key={item.link}
                to={item.link}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `text-3xl font-thai font-bold transition-colors cursor-pointer ${isActive ? "text-amber-500" : "text-white hover:text-amber-500"}`}
              >
                {item.label}
              </NavLink>
            );
          })}

          {renderMobileAuthButton()}
        </div>
      </nav>
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          {/* full-screen wrapper no padding for true responsive */}
          <div className="relative w-full h-full">
            <button
              onClick={closeManual}
              className="absolute top-4 right-4 text-3xl font-bold text-white hover:text-red-500 z-50"
            >
              ×
            </button>
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              คู่มือการใช้งาน <span className="text-amber-500">Lor Loei Cuts</span>
            </h2>
            {/* sliding carousel row */}
            <div className="relative flex flex-col items-center h-full">
              <div className="overflow-hidden w-full flex-1 h-full">
                <div
                  className="flex h-full transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentIdx * 100}%)` }}
                >
                  {manualImages.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`คู่มือ ${idx + 1}`}
                      className="w-full flex-shrink-0 max-h-[calc(100vh-100px)] object-contain"
                    />
                  ))}
                </div>
                {/* navigation arrows */}
                <button
                  onClick={() => setCurrentIdx((i) => (i - 1 + manualImages.length) % manualImages.length)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white text-3xl p-3 rounded-full"
                >‹</button>
                <button
                  onClick={() => setCurrentIdx((i) => (i + 1) % manualImages.length)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white text-3xl p-3 rounded-full"
                >›</button>
              </div>
              {/* dot indicators */}
              <div className="flex gap-2 mt-4">
                {manualImages.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-3 h-3 rounded-full cursor-pointer transition-colors ${idx === currentIdx ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}