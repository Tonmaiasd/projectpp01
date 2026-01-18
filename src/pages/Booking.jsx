import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, Star, Clock, 
  Sparkles, X, ChevronRight,
  User, Calendar, QrCode, MessageCircle, ArrowLeft
} from 'lucide-react';

export default function Booking() {
  const navigate = useNavigate();

  // --- State Management ---
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State สำหรับการจอง (Booking Modal)
  const [bookingStep, setBookingStep] = useState('select'); // 'select' | 'confirm' | 'success'
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    name: '',
    tel: ''
  });

  // --- Data Mockup ---
  const packages = [
    {
      id: 1,
      name: 'Classic Gentleman Cut',
      badge: 'Bestseller',
      badgeColor: 'bg-rose-500',
      price: 450,
      originalPrice: null,
      duration: 45,
      includes: ['ตัดผม', 'เซ็ตทรง', 'สระผม'],
      category: 'ตัด',
      rating: 4.9,
      reviews: 128,
      img: 'https://images.unsplash.com/photo-1593702295094-aea8c5c13d99?q=80&w=1974&auto=format&fit=crop',
      desc: 'ทรงผมคลาสสิกที่เหนือกาลเวลา เหมาะสำหรับสุภาพบุรุษที่ต้องการความเนี๊ยบ เรียบหรู ดูดีทุกสถานการณ์'
    },
    {
      id: 2,
      name: 'Fade Master & Beard Trim',
      badge: 'Recommended',
      badgeColor: 'bg-amber-500',
      price: 600,
      originalPrice: 700,
      duration: 60,
      includes: ['ตัดเฟด', 'โกนหนวด', 'ผ้าร้อน'],
      category: 'ครบวงจร',
      rating: 4.8,
      reviews: 86,
      img: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop',
      desc: 'ที่สุดของความคมเข้ม ด้วยเทคนิคการไล่เฟดระดับสูง พร้อมบริการดูแลหนวดเคราแบบครบสูตร'
    },
    {
      id: 3,
      name: 'Korean Style Perm',
      badge: 'Trending',
      badgeColor: 'bg-purple-500',
      price: 2500,
      originalPrice: 3000,
      duration: 180,
      includes: ['ตัดแต่ง', 'ดัดวอลลุ่ม', 'บำรุง'],
      category: 'เคมี',
      rating: 4.7,
      reviews: 42,
      img: 'https://images.unsplash.com/photo-1562004723-602d3858c8e9?q=80&w=1974&auto=format&fit=crop',
      desc: 'เปลี่ยนลุคให้ดูอบอุ่น มีสไตล์ ด้วยการดัดวอลลุ่มสไตล์เกาหลี ผมดูหนานุ่ม มีมิติ เป็นธรรมชาติ'
    },
    {
        id: 4,
        name: 'Executive Grooming',
        badge: 'Premium',
        badgeColor: 'bg-emerald-500',
        price: 1200,
        originalPrice: null,
        duration: 90,
        includes: ['ตัดผม', 'โกนหนวด', 'สปาหน้า', 'นวดไหล่'],
        category: 'สปา',
        rating: 5.0,
        reviews: 35,
        img: 'https://images.unsplash.com/photo-1503951914205-b27cfca5639e?q=80&w=2070&auto=format&fit=crop',
        desc: 'ประสบการณ์การพักผ่อนที่เหนือระดับ ดูแลครบทั้งผม หน้า และการผ่อนคลาย เพื่อภาพลักษณ์ที่ดีที่สุด'
      },
      {
        id: 5,
        name: 'Kids Cool Cut',
        badge: 'Popular',
        badgeColor: 'bg-blue-500',
        price: 300,
        originalPrice: null,
        duration: 30,
        includes: ['ตัดผมเด็ก', 'ของเล่น', 'ขนม'],
        category: 'ตัด',
        rating: 4.8,
        reviews: 64,
        img: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?q=80&w=2066&auto=format&fit=crop',
        desc: 'บริการตัดผมสำหรับหนูน้อย ด้วยช่างใจดีและเทคนิคพิเศษที่ทำให้เด็กๆ เพลิดเพลิน สนุกกับการตัดผม'
      },
      {
        id: 6,
        name: 'Hair Coloring',
        badge: 'New',
        badgeColor: 'bg-indigo-500',
        price: 1500,
        originalPrice: 1800,
        duration: 120,
        includes: ['ทำสีผม', 'ทรีทเม้นท์', 'เซ็ตทรง'],
        category: 'เคมี',
        rating: 4.6,
        reviews: 28,
        img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop',
        desc: 'สร้างสรรค์สีผมใหม่ให้โดดเด่น สะท้อนตัวตนของคุณ ด้วยผลิตภัณฑ์คุณภาพสูง ถนอมเส้นผม'
      }
  ];

  // --- Functions ---
  
  // กรองและเรียงลำดับข้อมูล
  const filteredPackages = packages
    .filter(pkg => 
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      pkg.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // recommended (default order)
    });

  // เปิด Modal เพื่อเริ่มการจอง
  const handleOpenBooking = (pkg) => {
    // เช็ค Login ก่อน
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
        if (window.confirm("คุณต้องเข้าสู่ระบบก่อนทำการจองคิว ต้องการไปหน้าเข้าสู่ระบบหรือไม่?")) {
            navigate("/login");
        }
        return;
    }

    setSelectedPackage(pkg);
    setBookingStep('select');
  };

  // ปิด Modal ทั้งหมด
  const closeAll = () => {
    setSelectedPackage(null);
    setBookingStep('select');
    setBookingData({ date: '', time: '', name: '', tel: '' });
  };

  // ยืนยันการจอง (จำลองการส่งข้อมูล)
  const confirmBooking = () => {
     if(!bookingData.date || !bookingData.time) {
         alert("กรุณาระบุวันและเวลาที่ต้องการจอง");
         return;
     }
     setBookingStep('success');
  };

  return (
    // เพิ่ม pt-24 เพื่อดันเนื้อหาลงมาให้พ้น Navbar หลัก
    <div className="bg-zinc-950 min-h-screen font-sans text-zinc-100 pb-20 pt-24 selection:bg-amber-500 selection:text-black">
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Manrope:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-num { font-family: 'Prompt', sans-serif; }
      `}</style>

      {/* --- HEADER --- */}
      {/* เปลี่ยนจาก top-0 เป็น top-20 (ประมาณ 80px) เพื่อให้ Sticky อยู่ใต้ Navbar หลักพอดี */}
      <header className="sticky top-20 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate("/")} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-xl font-serif font-bold text-white">
            บริการของเรา
          </h1>

          <button 
            className="p-2 rounded-full hover:bg-white/10 transition-colors relative text-zinc-400 hover:text-white"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <SlidersHorizontal className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="max-w-5xl mx-auto mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาทรงผม หรือ บริการ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-amber-500/50 transition-all text-white placeholder:text-zinc-600 font-medium focus:border-amber-500/50 outline-none"
            />
        </div>
      </header>

      {/* --- FILTER PANEL (Expandable) --- */}
      <div className={`overflow-hidden transition-all duration-300 bg-zinc-900 border-b border-white/5 ${filterOpen ? 'max-h-40 py-4' : 'max-h-0'}`}>
          <div className="max-w-5xl mx-auto px-6">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">จัดเรียงตาม</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                      { id: 'recommended', label: 'แนะนำ' },
                      { id: 'rating', label: 'คะแนนสูงสุด' },
                      { id: 'price_asc', label: 'ราคา (ต่ำ-สูง)' },
                      { id: 'price_desc', label: 'ราคา (สูง-ต่ำ)' },
                  ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSortBy(opt.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                            sortBy === opt.id 
                            ? 'bg-amber-500 text-black border-amber-500' 
                            : 'bg-zinc-800 text-zinc-400 border-white/5 hover:border-amber-500/50 hover:text-white'
                        }`}
                      >
                          {opt.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-300">รายการแพ็คเกจ (<span className="font-num">{filteredPackages.length}</span>)</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="bg-zinc-900 rounded-3xl p-4 shadow-xl hover:shadow-amber-500/10 transition-all duration-300 group border border-white/10 flex flex-col h-full hover:border-amber-500/30">
                    {/* Image Area */}
                    <div className="relative h-56 rounded-2xl overflow-hidden mb-4 bg-zinc-800">
                        <img src={pkg.img} alt={pkg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                        <div className="absolute top-3 left-3 flex gap-2">
                             {pkg.badge && (
                                 <span className={`${pkg.badgeColor} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm`}>
                                     {pkg.badge}
                                 </span>
                             )}
                        </div>
                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm border border-white/10">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-white font-num">{pkg.rating}</span>
                            <span className="text-zinc-400 font-normal font-num">({pkg.reviews})</span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-serif font-bold text-xl text-white leading-tight mb-1 group-hover:text-amber-500 transition-colors">{pkg.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                                    <span className="flex items-center gap-1 text-zinc-400"><Clock className="w-3 h-3 text-amber-500" /> <span className="font-num">{pkg.duration}</span> นาที</span>
                                    <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                    <span className="text-zinc-400">{pkg.category}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-2">{pkg.desc}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {pkg.includes.map((item, i) => (
                                <span key={i} className="text-[10px] font-bold bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md border border-white/5">
                                    {item}
                                </span>
                            ))}
                        </div>

                        {/* Price & Action */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                             <div className="flex flex-col">
                                 {pkg.originalPrice && <span className="text-xs text-zinc-500 line-through decoration-zinc-600 font-num">฿{pkg.originalPrice}</span>}
                                 <span className="text-2xl font-bold text-amber-500 font-num">฿{pkg.price}</span>
                             </div>
                             <button 
                               onClick={() => handleOpenBooking(pkg)}
                               className="bg-white hover:bg-amber-500 hover:text-black text-black px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 group/btn"
                             >
                                 จองเลย <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                             </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>


      {/* --- BOOKING MODAL OVERLAY --- */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={closeAll}></div>
            
            <div className="bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out] border border-white/10">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900 sticky top-0 z-10">
                    <div>
                         <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">
                             {bookingStep === 'success' ? 'Booking Confirmed' : 'Booking Details'}
                         </span>
                         <h3 className="font-serif font-bold text-xl text-white truncate pr-4">
                             {bookingStep === 'success' ? 'จองคิวสำเร็จ' : selectedPackage.name}
                         </h3>
                    </div>
                    <button onClick={closeAll} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto p-0 bg-zinc-950">
                    
                    {/* STEP 1: Select Date & Info */}
                    {bookingStep === 'select' && (
                        <div className="p-6 space-y-6">
                            {/* Package Summary */}
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-white/10 flex gap-4">
                                <div className="w-20 h-20 bg-zinc-800 rounded-xl overflow-hidden shrink-0">
                                    <img src={selectedPackage.img} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{selectedPackage.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                                        <Clock className="w-3 h-3 text-amber-500" /> <span className="font-num">{selectedPackage.duration}</span> นาที
                                    </div>
                                    <span className="text-amber-500 font-bold font-num">฿{selectedPackage.price}</span>
                                </div>
                            </div>

                            {/* Date & Time Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-zinc-400 mb-2 block flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-amber-500"/> วันที่
                                    </label>
                                    <input 
                                        type="date" 
                                        value={bookingData.date}
                                        onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-white scheme-dark font-num" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-zinc-400 mb-2 block flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500"/> เวลา
                                    </label>
                                    <input 
                                        type="time" 
                                        value={bookingData.time}
                                        onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-white scheme-dark font-num" 
                                    />
                                </div>
                            </div>

                             {/* User Info */}
                             <div className="space-y-4 pt-4 border-t border-white/10">
                                <div>
                                    <label className="text-sm font-bold text-zinc-400 mb-2 block flex items-center gap-2">
                                        <User className="w-4 h-4 text-amber-500"/> ชื่อผู้จอง
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="ระบุชื่อของคุณ"
                                        value={bookingData.name}
                                        onChange={(e) => setBookingData({...bookingData, name: e.target.value})}
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-zinc-600 text-white" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Success */}
                    {bookingStep === 'success' && (
                      <div className="p-8 text-center bg-zinc-950 min-h-[400px] flex flex-col items-center justify-center">
                          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                              <QrCode className="w-12 h-12 text-green-500" />
                          </div>
                          <h4 className="text-2xl font-serif font-bold text-white mb-2">จองคิวเรียบร้อย!</h4>
                          <p className="text-zinc-400 text-sm mb-8 max-w-xs mx-auto">
                              ระบบได้รับข้อมูลของคุณแล้ว กรุณาสแกน QR Code ด้านล่างเพื่อยืนยันการจองผ่าน LINE
                          </p>

                          <div className="bg-white p-6 rounded-2xl border border-white/10 mb-6 w-full max-w-sm">
                              <div className="flex flex-col items-center gap-4">
                                  {/* ใช้ QR Placeholder */}
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://line.me/ti/p/~your_line_id`} 
                                    alt="Line QR Code" 
                                    className="w-40 h-40 mix-blend-multiply"
                                  />
                              </div>
                              <div className="flex items-center justify-center gap-2 text-green-600 font-bold mt-4">
                                  <MessageCircle className="w-5 h-5" />
                                  <span>แอดไลน์เพื่อแจ้งโอนเงิน</span>
                              </div>
                          </div>
                      </div>
                    )}
                </div>

                {/* Modal Footer (Action Buttons) */}
                {bookingStep === 'select' && (
                    <div className="p-6 border-t border-white/10 bg-zinc-900">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-zinc-400 text-sm">ยอดรวมทั้งสิ้น</span>
                            <span className="text-2xl font-bold text-amber-500 font-num">฿{selectedPackage.price}</span>
                        </div>
                        <button
                            onClick={confirmBooking}
                            className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-lg"
                        >
                            ยืนยันการจอง
                        </button>
                    </div>
                )}
                 {bookingStep === 'success' && (
                     <div className="p-6 border-t border-white/10 bg-zinc-900">
                        <button
                            onClick={closeAll}
                            className="w-full bg-zinc-800 text-white py-4 rounded-xl font-bold hover:bg-zinc-700 transition-all"
                        >
                            ปิดหน้าต่าง
                        </button>
                     </div>
                 )}
            </div>
        </div>
      )}

    </div>
  );
}