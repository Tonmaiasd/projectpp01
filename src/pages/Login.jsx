import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Scissors,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, loginWithLine, user, isAdmin, loading: authLoading } = useContext(AuthContext);

  // --- LIFF ID ---
  const LIFF_ID = "2008933197-lBD8ZDCI";
  const [liffLoading, setLiffLoading] = useState(false);
  const [isRedirectFromBooking, setIsRedirectFromBooking] = useState(false);

  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    if (type === 'success') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') === 'booking') {
      setIsRedirectFromBooking(true);
      setError("กรุณาเข้าสู่ระบบผ่าน LINE เพื่อเริ่มการจองคิว");
    }
  }, []);

  // --- State ---
  const [currentPage, setCurrentPage] = useState("login"); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // Loading ของการกดปุ่ม Submit
  const [error, setError] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: ""
  });

  // Animation Trigger
  const [animate, setAnimate] = useState(false);

  // --- 1. Redirection Logic (สำคัญที่สุด) ---
  useEffect(() => {
    // ถ้าระบบเช็ค Auth เสร็จแล้ว (authLoading = false) และมี User
    if (!authLoading && user) {
      if (isAdmin) {
        navigate("/admin/dashboard");
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        if (redirect === 'booking') {
          navigate("/booking");
        } else {
          navigate("/");
        }
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Handle Automatic LINE Login after redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && !user && !authLoading) {
      handleLineLogin();
    }
  }, [user, authLoading]);

  // --- Animation Effect ---
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  // --- Handlers ---

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(formData.email, formData.password);
      // ไม่ต้องทำอะไรต่อ useEffect ด้านบนจะทำงานเองเมื่อ Login ผ่าน
    } catch (err) {
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await register(formData.email, formData.password, {
        data: { name: formData.name, phone: formData.phone }
      });
      showNotification("สมัครสมาชิกเรียบร้อย! กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน", "success");
      setAnimate(false);
      setCurrentPage("login");
      setFormData({ email: "", password: "", name: "", phone: "" });
    } catch (err) {
      console.error('Registration error:', err);
      setError("สมัครสมาชิกไม่สำเร็จ หรืออีเมลนี้ถูกใช้งานแล้ว");
    } finally {
      setLoading(false);
    }
  };

  const togglePage = () => {
    setAnimate(false);
    setError(null);
    setCurrentPage(currentPage === "login" ? "register" : "login");
  };

  // --- LINE Login Handler ---
  const handleLineLogin = async () => {
    setLiffLoading(true);
    setError(null);

    const loadLiffScript = () => {
      return new Promise((resolve, reject) => {
        if (window.liff) return resolve();
        const script = document.createElement('script');
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load LIFF SDK"));
        document.body.appendChild(script);
      });
    };

    try {
      await loadLiffScript();
      await window.liff.init({ liffId: LIFF_ID });

      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }

      const profile = await window.liff.getProfile();
      await loginWithLine(profile);
      // navigation is handled by useEffect
    } catch (err) {
      console.error("LINE Login Error:", err);
      setError("การเข้าสู่ระบบผ่าน LINE ล้มเหลว: " + err.message);
    } finally {
      setLiffLoading(false);
    }
  };

  // --- 2. Prevent Flash (ป้องกันหน้ากระพริบ) ---
  // ถ้า AuthContext ยังเช็คไม่เสร็จ ให้แสดงหน้า Loading หรือจอว่างๆ แทน
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-amber-500 selection:text-black relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
      `}</style>

      {/* Grid Layout: ซ้ายรูปภาพ / ขวาฟอร์ม */}
      <div className="bg-zinc-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2 border border-white/10 min-h-[600px] relative z-10">

        {/* --- LEFT SIDE: IMAGE & BRANDING --- */}
        <div className="relative hidden md:block overflow-hidden group">
          <img
            src="https://images.unsplash.com/photo-1503951914205-b27cfca5639e?q=80&w=2070&auto=format&fit=crop"
            alt="Barbershop Atmosphere"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

          <div className="absolute bottom-10 left-10 right-10 z-10">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <Scissors className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-4xl font-serif font-bold text-white mb-4">Lor Loei Cuts</h2>
            <p className="text-zinc-300 leading-relaxed text-lg">
              "เพราะทรงผมคือบุคลิกภาพ เราจึงใส่ใจในทุกรายละเอียด เพื่อสไตล์ที่ดีที่สุดของคุณ"
            </p>
          </div>
        </div>

        {/* --- RIGHT SIDE: FORM --- */}
        <div className="relative flex flex-col justify-center p-8 md:p-12 lg:p-16">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> กลับหน้าหลัก
          </button>

          <div className={`transition-all duration-500 transform ${animate ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>

            <div className="mb-10 mt-8">
              <span className="text-amber-500 font-bold tracking-widest uppercase text-xs mb-2 block">
                {currentPage === "login" ? "Welcome Back" : "Join Us Today"}
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
                {isRedirectFromBooking ? "เข้าสู่ระบบ LINE เพื่อจองคิว" : (currentPage === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่")}
              </h2>
              <p className="text-zinc-500">
                {currentPage === "login"
                  ? "กรอกข้อมูลเพื่อเข้าใช้งานระบบจองคิว"
                  : "สมัครสมาชิกเพื่อรับสิทธิพิเศษและโปรโมชั่น"}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={currentPage === "login" ? handleLogin : handleRegister} className="space-y-5">

              {/* Name Field (Register Only) */}
              {currentPage === "register" && (
                <div className="group">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      placeholder="ชื่อ-นามสกุล"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 text-white pl-12 pr-4 py-4 rounded-xl border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              )}

              {/* Email or Phone Field */}
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {currentPage === "login" ? (
                      <User className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    ) : (
                      <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    )}
                  </div>
                  <input
                    type={currentPage === "login" ? "text" : "email"}
                    name="email"
                    placeholder={currentPage === "login" ? "อีเมล หรือ เบอร์โทรศัพท์" : "อีเมลของคุณ"}
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 text-white pl-12 pr-4 py-4 rounded-xl border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Phone Field (Register Only) */}
              {currentPage === "register" && (
                <div className="group">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="เบอร์โทรศัพท์"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-zinc-950 text-white pl-12 pr-4 py-4 rounded-xl border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="รหัสผ่าน"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-zinc-950 text-white pl-12 pr-12 py-4 rounded-xl border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password (Login Only) */}
              {currentPage === "login" && (
                <div className="flex justify-end">
                  <a href="#" className="text-sm text-zinc-500 hover:text-amber-500 transition-colors">ลืมรหัสผ่าน?</a>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    กำลังประมวลผล...
                  </span>
                ) : (
                  <>
                    {currentPage === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Social Login Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-4 text-zinc-500 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            {/* LINE Login Button */}
            <button
              onClick={handleLineLogin}
              disabled={loading || liffLoading}
              className="w-full bg-[#06C755] hover:bg-[#05b34d] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(6,199,85,0.1)] hover:shadow-[0_0_30px_rgba(6,199,85,0.2)] transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-6 h-6 fill-white" />
              {liffLoading ? "กำลังเชื่อมต่อ LINE..." : "เข้าสู่ระบบด้วย LINE"}
            </button>

            {/* Toggle Login/Register */}
            <div className="mt-8 text-center pt-6 border-t border-white/5">
              <p className="text-zinc-500">
                {currentPage === "login" ? "ยังไม่มีบัญชีสมาชิก?" : "มีบัญชีอยู่แล้ว?"}
                <button
                  onClick={togglePage}
                  className="text-amber-500 font-bold hover:text-amber-400 ml-2 transition-colors inline-flex items-center gap-1 group"
                >
                  {currentPage === "login" ? "สมัครสมาชิกเลย" : "เข้าสู่ระบบ"}
                  <ArrowLeft className={`w-4 h-4 transition-transform ${currentPage === "login" ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`} />
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* --- Admin Shortcut (Optional) --- */}
      <div className="absolute bottom-4 right-4 z-20 opacity-30 hover:opacity-100 transition-opacity">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center gap-2 text-xs text-white bg-zinc-800 px-3 py-1 rounded-full border border-white/10 hover:bg-zinc-700"
        >
          <ShieldCheck size={12} /> Admin Portal
        </button>
      </div>

    </div>
  );
}