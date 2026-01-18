import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ShieldCheck 
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  // --- State ---
  const [currentPage, setCurrentPage] = useState("login"); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: ""
  });

  // Animation Trigger
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // เมื่อ currentPage เปลี่ยน (หรือโหลดครั้งแรก) ให้รอ 50ms แล้วค่อยแสดงผล (Fade-in)
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Logic การทำงาน ---

  // 1. ฟังก์ชัน Login
  const handleLogin = (e) => {
    e.preventDefault();
    
    // Validation: เช็คว่ากรอกข้อมูลครบไหม
    if (!formData.email || !formData.password) {
        alert("กรุณากรอก อีเมล/เบอร์โทรศัพท์ และรหัสผ่าน");
        return;
    }

    setLoading(true);

    // จำลอง API Call (หน่วงเวลา 1.5 วินาที)
    setTimeout(() => {
      setLoading(false);
      
      // *** ตรวจสอบพิเศษ: ถ้าใช้อีเมล admin ให้ไปหน้า Admin Dashboard ***
      if (formData.email === "admin" && formData.password === "admin") {
          localStorage.setItem("admin_token", "super-secret-admin-token");
          alert("เข้าสู่ระบบผู้ดูแลระบบเรียบร้อย");
          navigate("/admin/dashboard");
          return;
      }

      // *** กรณีลูกค้าทั่วไป ***
      localStorage.setItem("token", "dummy-user-token-123456");
      
      // สร้างชื่อ User จากข้อมูลที่กรอก (ตัด @ ออกถ้าเป็นอีเมล)
      const userNameDisplay = formData.email.includes('@') 
        ? formData.email.split('@')[0] 
        : formData.email;
        
      localStorage.setItem("user_name", userNameDisplay);

      // ใช้ window.location.href แทน navigate เพื่อให้ Navbar รีเฟรชสถานะทันที
      window.location.href = "/"; 
    }, 1500);
  };

  // 2. ฟังก์ชัน Register
  const handleRegister = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    setLoading(true);

    // จำลอง API Call
    setTimeout(() => {
      setLoading(false);
      alert("สมัครสมาชิกเรียบร้อย! กรุณาเข้าสู่ระบบ");
      
      // สั่งซ่อนก่อนเปลี่ยนหน้า เพื่อให้ effect ทำงานตอนเปลี่ยนกลับมา login
      setAnimate(false); 
      setCurrentPage("login"); 
      setFormData({ ...formData, password: "" }); // ล้างรหัสผ่าน
    }, 1500);
  };

  // ฟังก์ชันสำหรับสลับหน้า (Login <-> Register)
  const togglePage = () => {
    // สั่งซ่อนเนื้อหาเก่าทันที แล้วค่อยเปลี่ยนหน้า
    setAnimate(false);
    setCurrentPage(currentPage === "login" ? "register" : "login");
  };

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
                    {currentPage === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
                </h2>
                <p className="text-zinc-500">
                    {currentPage === "login" 
                        ? "กรอกข้อมูลเพื่อเข้าใช้งานระบบจองคิว" 
                        : "สมัครสมาชิกเพื่อรับสิทธิพิเศษและโปรโมชั่น"}
                </p>
            </div>

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
                      {/* เปลี่ยนไอคอนตามหน้า: Login ใช้ User (สื่อถึง ID), Register ใช้ Mail */}
                      {currentPage === "login" ? (
                        <User className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                      ) : (
                        <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                      )}
                    </div>
                    <input
                      type={currentPage === "login" ? "text" : "email"}
                      name="email" // ใช้ key เดิม (email) ในการเก็บค่า เพื่อให้ logic ไม่ซับซ้อน
                      placeholder={currentPage === "login" ? "อีเมล หรือ เบอร์โทรศัพท์ (Admin: admin)" : "อีเมลของคุณ"}
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
                      placeholder={currentPage === "login" ? "รหัสผ่าน (Admin: admin)" : "รหัสผ่าน"}
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