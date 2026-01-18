import React, { useState, useRef } from "react";
import { 
  User, Mail, Phone, MapPin, Edit2, 
  History, Calendar, Clock, Scissors, 
  LogOut, Save, X, Camera, CheckCircle, 
  XCircle, Clock4, Filter, AlertCircle, CalendarClock
} from "lucide-react";

export default function Profile() {
  const fileInputRef = useRef(null); // Ref สำหรับ input file (ซ่อนอยู่)
  
  // --- State Management ---
  const [isEditing, setIsEditing] = useState(false);
  const [filterType, setFilterType] = useState('All'); // ตัวเลือกกรอง: All, Upcoming, History
  
  // ฟังก์ชันสำหรับกำหนดค่าเริ่มต้นของ User (Lazy Initialization) เพื่อแก้ปัญหา Re-render
  const getInitialUser = () => {
    const defaultUser = {
      username: "Member001",
      fullName: "คุณลูกค้า สุดหล่อ",
      email: "customer@example.com",
      phone: "099-123-4567",
      address: "272/47 ถนนเทศบาลสงเคราะห์ อ.เมือง จ.สกลนคร 47000",
      avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop"
    };

    // ดึงชื่อจาก localStorage มาตรวจสอบทันทีตอนโหลด
    const storedName = localStorage.getItem("user_name");
    if (storedName) {
      return {
        ...defaultUser,
        username: storedName,
        email: storedName.includes('@') ? storedName : `${storedName}@email.com`
      };
    }
    return defaultUser;
  };

  // ข้อมูลผู้ใช้
  const [user, setUser] = useState(getInitialUser);
  const [formData, setFormData] = useState(user);

  // ข้อมูลประวัติการจอง (จำลองสถานะต่างๆ)
  const [bookings] = useState([
    { id: "BK-005", service: "Hair Coloring", barber: "ช่างเอก", date: "2024-12-30", time: "10:00", price: 1200, status: "Confirmed" },
    { id: "BK-004", service: "Hot Towel Shave", barber: "ช่างเอก", date: "2024-12-29", time: "15:30", price: 350, status: "Pending" },
    { id: "BK-003", service: "Classic Haircut", barber: "ช่างเอก", date: "2024-12-25", time: "13:00", price: 450, status: "Cancelled" },
    { id: "BK-002", service: "Full Grooming", barber: "ช่างเอก", date: "2024-11-20", time: "14:00", price: 800, status: "Completed" },
    { id: "BK-001", service: "Classic Haircut", barber: "ช่างเอก", date: "2024-10-15", time: "10:30", price: 450, status: "Completed" },
  ]);

  // Logic การกรองข้อมูล
  const filteredBookings = bookings.filter(b => {
    if (filterType === 'Upcoming') return ['Pending', 'Confirmed'].includes(b.status);
    if (filterType === 'History') return ['Completed', 'Cancelled'].includes(b.status);
    return true; // All
  });

  // --- Handlers ---
  const handleLogout = () => {
    if (window.confirm("ยืนยันการออกจากระบบ?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_name");
      window.location.href = "/login"; 
    }
  };

  const handleEditClick = () => {
    setFormData(user);
    setIsEditing(true);
  };

  const handleSave = () => {
    setUser(formData);
    setIsEditing(false);
    alert("บันทึกข้อมูลเรียบร้อย!");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatar = reader.result;
        setUser(prev => ({ ...prev, avatar: newAvatar }));
        setFormData(prev => ({ ...prev, avatar: newAvatar }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ฟังก์ชันสำหรับขอเลื่อนคิว
  const handleRescheduleRequest = (id) => {
    const newDate = prompt("ระบุวันที่และเวลาที่ต้องการขอเลื่อน (เช่น 01/01/2025 10:00 น.):");
    if (newDate) {
      alert(`ส่งคำขอเลื่อนคิวสำหรับ Booking #${id} เรียบร้อยแล้ว\nรายละเอียดที่ขอ: ${newDate}\n\nทางร้านจะตรวจสอบและติดต่อกลับเพื่อยืนยันครับ`);
    }
  };

  // Helper: แสดงสถานะภาษาไทยและสี
  const getStatusDisplay = (status) => {
    switch (status) {
      case "Confirmed": 
        return { 
          text: "อนุมัติแล้ว", 
          color: "text-blue-400 bg-blue-400/10 border-blue-400/20", 
          icon: <CheckCircle size={14} /> 
        };
      case "Pending": 
        return { 
          text: "รออนุมัติ", 
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20", 
          icon: <Clock4 size={14} /> 
        };
      case "Cancelled": 
        return { 
          text: "ยกเลิก", 
          color: "text-red-500 bg-red-500/10 border-red-500/20", 
          icon: <XCircle size={14} /> 
        };
      case "Completed": 
        return { 
          text: "เสร็จสิ้น", 
          color: "text-green-500 bg-green-500/10 border-green-500/20", 
          icon: <CheckCircle size={14} /> 
        };
      default: 
        return { 
          text: status, 
          color: "text-zinc-400 bg-zinc-800", 
          icon: <AlertCircle size={14} /> 
        };
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-28 pb-20 font-sans selection:bg-amber-500 selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-num { font-family: 'Prompt', sans-serif; }
      `}</style>

      {/* Input File แบบซ่อน */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="max-w-6xl mx-auto px-6">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
          <div>
             <span className="text-amber-500 font-bold tracking-widest uppercase text-xs mb-2 block">My Account</span>
             <h1 className="text-4xl md:text-5xl font-serif font-bold text-white">ข้อมูลส่วนตัว</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all duration-300 border border-red-600/20 font-bold text-sm"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* --- Left Column: Profile Card --- */}
          <div className="lg:col-span-1">
             <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/20 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div 
                     className="w-32 h-32 rounded-full border-4 border-zinc-900 shadow-xl overflow-hidden mb-6 relative group cursor-pointer"
                     onClick={handleAvatarClick}
                     title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
                   >
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="text-white" size={24} />
                      </div>
                   </div>
                   
                   <h2 className="text-2xl font-bold text-white mb-1">{user.fullName}</h2>
                   <p className="text-amber-500 font-medium mb-6">@{user.username}</p>

                   <div className="w-full space-y-4 text-left bg-zinc-950/50 p-6 rounded-2xl border border-white/5">
                      <div className="flex items-start gap-3">
                         <Mail className="w-5 h-5 text-zinc-500 mt-0.5" />
                         <div className="min-w-0">
                            <p className="text-xs text-zinc-500 uppercase font-bold">อีเมล</p>
                            <p className="text-zinc-300 text-sm truncate">{user.email}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Phone className="w-5 h-5 text-zinc-500 mt-0.5" />
                         <div>
                            <p className="text-xs text-zinc-500 uppercase font-bold">เบอร์โทรศัพท์</p>
                            <p className="text-zinc-300 text-sm font-num">{user.phone}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <MapPin className="w-5 h-5 text-zinc-500 mt-0.5" />
                         <div>
                            <p className="text-xs text-zinc-500 uppercase font-bold">ที่อยู่</p>
                            <p className="text-zinc-300 text-sm leading-relaxed">{user.address}</p>
                         </div>
                      </div>
                   </div>

                   <button 
                     onClick={handleEditClick}
                     className="w-full mt-6 py-3 bg-zinc-800 hover:bg-amber-500 hover:text-black text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                   >
                     <Edit2 size={18} /> แก้ไขข้อมูล
                   </button>
                </div>
             </div>
          </div>

          {/* --- Right Column: Booking History --- */}
          <div className="lg:col-span-2">
             <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-xl min-h-[600px]">
                
                {/* History Header & Filters */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                   <div className="flex items-center gap-3">
                      <History className="text-amber-500" />
                      <h3 className="text-xl font-bold text-white">ประวัติการจอง</h3>
                   </div>
                   
                   <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                      {['All', 'Upcoming', 'History'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setFilterType(tab)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                            filterType === tab 
                            ? 'bg-zinc-800 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {tab === 'All' ? 'ทั้งหมด' : tab === 'Upcoming' ? 'กำลังมาถึง / รออนุมัติ' : 'ประวัติเก่า / ยกเลิก'}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Booking List */}
                <div className="space-y-4">
                   {filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => {
                         const statusInfo = getStatusDisplay(booking.status);
                         return (
                           <div key={booking.id} className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-start gap-4">
                                 <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors shrink-0">
                                    <Scissors size={24} />
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-2 mb-1">
                                       <h4 className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">{booking.service}</h4>
                                       <span className="text-xs text-zinc-500 font-num">#{booking.id}</span>
                                    </div>
                                    <p className="text-zinc-400 text-sm mb-2">โดยช่าง: <span className="text-white">{booking.barber}</span></p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                       <span className="flex items-center gap-1 font-num bg-zinc-900 px-2 py-1 rounded border border-white/5"><Calendar size={12}/> {booking.date}</span>
                                       <span className="flex items-center gap-1 font-num bg-zinc-900 px-2 py-1 rounded border border-white/5"><Clock size={12}/> {booking.time} น.</span>
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                                 <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${statusInfo.color}`}>
                                        {statusInfo.icon}
                                        {statusInfo.text}
                                    </span>
                                    <span className="text-xl font-bold font-num text-white">฿{booking.price}</span>
                                 </div>
                                 
                                 {/* ปุ่มขอเลื่อนคิว เฉพาะสถานะ Confirmed */}
                                 {booking.status === 'Confirmed' && (
                                    <button 
                                      onClick={() => handleRescheduleRequest(booking.id)}
                                      className="text-xs text-amber-500 hover:text-white flex items-center gap-1.5 transition-colors border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 rounded-lg hover:bg-amber-500/20"
                                    >
                                      <CalendarClock size={14} /> ขอเลื่อนคิว
                                    </button>
                                 )}
                              </div>
                           </div>
                         );
                      })
                   ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                         <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Filter size={24} />
                         </div>
                         <p>ไม่พบรายการจองในหมวดหมู่นี้</p>
                      </div>
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* --- Edit Modal --- */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditing(false)}></div>
          <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl relative z-10 p-6 md:p-8 animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Edit2 className="text-amber-500" size={20}/> แก้ไขข้อมูลส่วนตัว
               </h3>
               <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                 <X size={24} />
               </button>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-sm font-bold text-zinc-400 mb-2 block">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName} 
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-zinc-400 mb-2 block">Username</label>
                    <input 
                      type="text" 
                      name="username"
                      value={formData.username} 
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-zinc-400 mb-2 block">เบอร์โทรศัพท์</label>
                    <input 
                      type="text" 
                      name="phone"
                      value={formData.phone} 
                      onChange={handleChange}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-num"
                    />
                  </div>
               </div>
               <div>
                  <label className="text-sm font-bold text-zinc-400 mb-2 block">อีเมล</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email} 
                    onChange={handleChange}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                  />
               </div>
               <div>
                  <label className="text-sm font-bold text-zinc-400 mb-2 block">ที่อยู่</label>
                  <textarea 
                    name="address"
                    value={formData.address} 
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors resize-none"
                  />
               </div>
            </div>

            <div className="mt-8 flex gap-4">
               <button 
                 onClick={() => setIsEditing(false)}
                 className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all"
               >
                 ยกเลิก
               </button>
               <button 
                 onClick={handleSave}
                 className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
               >
                 <Save size={18} /> บันทึก
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}