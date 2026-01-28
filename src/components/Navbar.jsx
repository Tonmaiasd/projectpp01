import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Scissors, Menu, X } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  const navItems = [
    { label: "หน้าแรก", link: "/" },
    { label: "จองคิว/บริการ", link: "/booking" },
    { label: "ข้อมูลส่วนตัว", link: "/profile" },
  ];

  const renderAuthButton = () => {
    if (loading) {
      return (
        <div className="w-[120px] h-[48px] bg-zinc-800 rounded-full animate-pulse" />
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
        className={`sticky top-0 w-full z-50 transition-all duration-500 border-b ${
          scrolled
            ? "bg-zinc-950/80 backdrop-blur-xl border-white/10 py-3 shadow-lg shadow-black/50"
            : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center">
            
            <NavLink to="/" className="flex items-center gap-4 group cursor-pointer z-50 relative">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] group-hover:scale-105 transition-all duration-500">
                <Scissors size={28} fill="currentColor" className="group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl lg:text-3xl font-bold font-serif tracking-widest text-white leading-none group-hover:text-amber-400 transition-colors duration-300">
                  LOR LOEI CUTS
                </h1>
                <p className="text-[11px] font-medium text-amber-500/80 uppercase tracking-[0.3em] mt-1 group-hover:text-amber-400 transition-colors font-thai">
                  หล่อเลย คัทซ์
                </p>
              </div>
            </NavLink>

            <div className="hidden lg:flex items-center gap-6 font-thai">
              <div className="flex items-center gap-1 bg-black/20 backdrop-blur-2xl px-2 py-2 rounded-full border border-white/10 shadow-2xl shadow-black/10 ring-1 ring-white/5">
                {navItems.map((item) => (
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
                ))}
              </div>

              {renderAuthButton()}
            </div>

            <button className="lg:hidden text-white active:scale-95 transition-transform z-50" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={32} className="text-amber-500" /> : <Menu size={32} />}
            </button>
          </div>
        </div>

        <div className={`fixed inset-0 bg-zinc-950/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center space-y-8 transition-all duration-500 lg:hidden ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
           {navItems.map((item) => (
              <NavLink
                key={item.link}
                to={item.link}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `text-3xl font-thai font-bold transition-colors cursor-pointer ${isActive ? "text-amber-500" : "text-white hover:text-amber-500"}`}
              >
                {item.label}
              </NavLink>
           ))}
           
           {renderMobileAuthButton()}
        </div>
      </nav>
    </>
  );
}