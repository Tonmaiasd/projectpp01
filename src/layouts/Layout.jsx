import { Outlet, Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Scissors, Phone, MapPin, Facebook } from "lucide-react";

export default function Layout() {
  const navigate = useNavigate();

  return (
    // เปลี่ยนพื้นหลังหลักเป็นสีเข้ม (zinc-950)
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Global Font Styles for the layout */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-thai { font-family: 'Noto Sans Thai', sans-serif; }
      `}</style>

      {/* Navbar: Sticky Top หรือ Fixed จะถูกจัดการภายใน Component Navbar เอง */}
      <Navbar />

      {/* Main Content: ปล่อยอิสระให้เต็มจอ (Full Width) */}
      <main className="flex-grow">
        {/* เนื้อหาจาก Home.jsx จะแสดงผลเต็มจอทันที */}
        <Outlet />
      </main>

      {/* Footer: ดีไซน์ใหม่ */}
      <footer className="bg-black pt-16 pb-8 border-t border-white/10 font-thai">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-serif text-white mb-4 flex items-center gap-2">
                <Scissors className="text-amber-500" /> LOR LOEI CUTS
              </h3>
              <p className="text-zinc-500 leading-relaxed mb-6 max-w-sm">
                ร้านตัดผมชายที่ให้ความสำคัญกับสไตล์และคุณภาพ เราพร้อมดูแลบุคลิกภาพของคุณให้ดูดีที่สุด ในบรรยากาศที่เป็นกันเอง
              </p>
              <div className="flex gap-4">
                <a 
                  href="https://www.facebook.com/p/%E0%B8%AB%E0%B8%A5%E0%B9%88%E0%B8%AD%E0%B9%80%E0%B8%A5%E0%B8%A2-%E0%B8%84%E0%B8%B1%E0%B8%97%E0%B8%8B%E0%B9%8C-100063526962016/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <Facebook size={20}/>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">เมนูลัด</h4>
              <ul className="space-y-3 text-zinc-400">
                <li>
                  <Link to="/" className="hover:text-amber-500 transition-colors">หน้าแรก</Link>
                </li>
                {/* ใช้ navigate เพื่อไปหน้า Booking */}
                <li>
                  <button onClick={() => navigate("/booking")} className="hover:text-amber-500 transition-colors text-left">
                    บริการราคา
                  </button>
                </li>
                <li>
                   {/* ลิงก์ไปยังส่วนโปรโมชั่นหน้าแรก */}
                  <a href="/#Promotions" className="hover:text-amber-500 transition-colors">โปรโมชั่น</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">ติดต่อ</h4>
              <ul className="space-y-3 text-zinc-400 text-sm">
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-amber-500"/> 092-268-9270
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={14} className="text-amber-500 mt-1"/> ถนนเทศบาลสงเคราะห์, สกลนคร
                </li>
                <li className="flex items-center gap-2 text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> เปิดให้บริการ
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
            <p>© 2024 หล่อเลย คัทซ์ (Lor Loei Cuts). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}