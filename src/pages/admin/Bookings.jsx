import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { Search, Filter, MoreHorizontal, CheckCircle, XCircle, Clock, Calendar, X, Plus, CalendarClock, ArrowLeft } from 'lucide-react'; // เพิ่ม ArrowLeft

export default function Bookings() {
  const navigate = useNavigate(); // 2. เรียกใช้ Hook
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- State สำหรับ Modal Walk-in ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    customer: '',
    service: '',
    date: new Date().toISOString().split('T')[0], // วันที่ปัจจุบัน
    time: '',
    price: ''
  });

  // 1. Mock Data เป็น State
  const [bookings, setBookings] = useState([
    { id: "BK001", customer: "คุณสมชาย", service: "ตัดผมชายวินเทจ", date: "2024-12-25", time: "10:30", barber: "ช่างเอก", price: "450", status: "Completed" },
    { id: "BK002", customer: "คุณวิชัย", service: "โกนหนวด", date: "2024-12-25", time: "11:00", barber: "ช่างเอก", status: "Pending" },
    { id: "BK003", customer: "น้องเก่ง", service: "ตัดผมเด็ก", date: "2024-12-26", time: "13:00", barber: "ช่างเอก", status: "Confirmed" },
    { id: "BK004", customer: "คุณอาทิตย์", service: "ดัดวอลลุ่ม", date: "2024-12-26", time: "14:30", barber: "ช่างเอก", status: "Cancelled" },
    { id: "BK005", customer: "คุณก้อง", service: "ทำสีผม", date: "2024-12-27", time: "09:00", barber: "ช่างเอก", status: "Pending" },
  ]);

  // 2. ฟังก์ชันอัปเดตสถานะ
  const handleUpdateStatus = (id, newStatus) => {
    const actionName = newStatus === 'Confirmed' ? 'อนุมัติ' : 'ยกเลิก';
    if (window.confirm(`คุณต้องการ "${actionName}" การจองนี้ใช่หรือไม่?`)) {
        setBookings(prevBookings => 
            prevBookings.map(booking => 
                booking.id === id ? { ...booking, status: newStatus } : booking
            )
        );
    }
  };

  // Helper function: บวกเวลาเพิ่ม (นาที)
  const addMinutesToTime = (timeStr, minutesToAdd) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(mins + minutesToAdd);
    
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMins = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMins}`;
  };

  // ฟังก์ชันเลื่อนคิว (Reschedule)
  const handleReschedule = (id) => {
    const targetBooking = bookings.find(b => b.id === id);
    if (!targetBooking) return;

    if (window.confirm(`ต้องการเลื่อนคิวของคุณ ${targetBooking.customer} และคิวถัดไปทั้งหมดออกไป 20 นาที ใช่หรือไม่?`)) {
        setBookings(prevBookings => 
            prevBookings.map(b => {
                if (b.date === targetBooking.date && b.time >= targetBooking.time && b.status !== 'Cancelled') {
                    return { ...b, time: addMinutesToTime(b.time, 20) };
                }
                return b;
            })
        );
    }
  };

  // 3. ฟังก์ชันบันทึก Walk-in
  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkInForm.customer || !walkInForm.service || !walkInForm.time || !walkInForm.price) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    const newBooking = {
        id: `BK${Math.floor(Math.random() * 10000)}`,
        customer: walkInForm.customer,
        service: walkInForm.service,
        date: walkInForm.date,
        time: walkInForm.time,
        barber: "ช่างเอก",
        price: walkInForm.price,
        status: "Confirmed"
    };

    setBookings([newBooking, ...bookings]);
    setShowWalkInModal(false);
    setWalkInForm({
        customer: '',
        service: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        price: ''
    });
    alert("เพิ่มคิว Walk-in เรียบร้อยแล้ว");
  };

  // ฟังก์ชันกรองข้อมูล
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'All' || booking.status === filterStatus;
    const matchesSearch = booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const styles = {
        Completed: "bg-green-500/10 text-green-500 border-green-500/20",
        Pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        Confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.Pending}`}>
            {status}
        </span>
    );
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* ปุ่มย้อนกลับไป Dashboard */}
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="กลับไปหน้า Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-serif font-bold text-white">จัดการการจอง</h1>
            <p className="text-zinc-400 text-sm">ตรวจสอบและจัดการคิวลูกค้าทั้งหมด</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           {/* ปุ่มเปิด Modal */}
           <button 
             onClick={() => setShowWalkInModal(true)}
             className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
           >
             <Plus size={18} /> จองคิวใหม่ (Walk-in)
           </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
            {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
               <button
                 key={status}
                 onClick={() => setFilterStatus(status)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    filterStatus === status 
                    ? 'bg-zinc-800 text-white border border-white/10 shadow-sm' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                 }`}
               >
                 {status}
               </button>
            ))}
         </div>
         <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อลูกค้า หรือ ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-zinc-600"
            />
         </div>
      </div>

      {/* Booking Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                     <th className="px-6 py-4 font-medium">Booking ID</th>
                     <th className="px-6 py-4 font-medium">ลูกค้า</th>
                     <th className="px-6 py-4 font-medium">บริการ</th>
                     <th className="px-6 py-4 font-medium">วัน-เวลา</th>
                     <th className="px-6 py-4 font-medium">ช่าง</th>
                     <th className="px-6 py-4 font-medium">สถานะ</th>
                     <th className="px-6 py-4 font-medium text-right">จัดการ</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                  {filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => (
                         <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-num text-zinc-500 font-medium">#{booking.id}</td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-white block text-lg">{booking.customer}</span>
                            </td>
                            <td className="px-6 py-4 text-zinc-300">{booking.service}</td>
                            
                            {/* --- ส่วนวันและเวลาที่ปรับให้เด่น --- */}
                            <td className="px-6 py-4">
                               <div className="flex flex-col gap-1">
                                  <span className="text-white font-bold text-base flex items-center gap-2">
                                    <Calendar size={16} className="text-zinc-400"/> {booking.date}
                                  </span>
                                  <span className="text-amber-500 font-bold text-xl flex items-center gap-2 font-num mt-1 bg-amber-500/10 w-fit px-2 py-0.5 rounded">
                                    <Clock size={18}/> {booking.time} น.
                                  </span>
                               </div>
                            </td>

                            <td className="px-6 py-4 text-zinc-300">{booking.barber}</td>
                            <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  
                                  {/* ปุ่มเลื่อนคิว (Reschedule) - สีฟ้า +20 นาที */}
                                  <button 
                                    onClick={() => handleReschedule(booking.id)}
                                    title="เลื่อนคิว (+20 นาที)" 
                                    className="p-2 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                  >
                                    <CalendarClock size={18}/>
                                  </button>

                                  {/* ปุ่มอนุมัติ */}
                                  <button 
                                    onClick={() => handleUpdateStatus(booking.id, 'Confirmed')}
                                    title="อนุมัติ" 
                                    className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors"
                                  >
                                    <CheckCircle size={18}/>
                                  </button>
                                  
                                  {/* ปุ่มยกเลิก */}
                                  <button 
                                    onClick={() => handleUpdateStatus(booking.id, 'Cancelled')}
                                    title="ยกเลิก" 
                                    className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                  >
                                    <XCircle size={18}/>
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))
                  ) : (
                      <tr>
                          <td colSpan="7" className="px-6 py-10 text-center text-zinc-500">
                              ไม่พบข้อมูลการจองที่ค้นหา
                          </td>
                      </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- Walk-in Modal --- */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus size={20} className="text-amber-500"/> เพิ่มคิว Walk-in
                    </h3>
                    <button onClick={() => setShowWalkInModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleWalkInSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">ชื่อลูกค้า</label>
                        <input 
                            type="text" 
                            required
                            placeholder="ระบุชื่อลูกค้า..."
                            value={walkInForm.customer}
                            onChange={e => setWalkInForm({...walkInForm, customer: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">บริการ</label>
                        <select 
                            required
                            value={walkInForm.service}
                            onChange={e => setWalkInForm({...walkInForm, service: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        >
                            <option value="">-- เลือกบริการ --</option>
                            <option value="ตัดผมชายวินเทจ">ตัดผมชายวินเทจ</option>
                            <option value="ตัดผมเด็ก">ตัดผมเด็ก</option>
                            <option value="โกนหนวด">โกนหนวด</option>
                            <option value="ดัดวอลลุ่ม">ดัดวอลลุ่ม</option>
                            <option value="ทำสีผม">ทำสีผม</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">วันที่</label>
                            <input 
                                type="date" 
                                required
                                value={walkInForm.date}
                                onChange={e => setWalkInForm({...walkInForm, date: e.target.value})}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">เวลา</label>
                            <input 
                                type="time" 
                                required
                                value={walkInForm.time}
                                onChange={e => setWalkInForm({...walkInForm, time: e.target.value})}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">ราคา (บาท)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="0.00"
                            value={walkInForm.price}
                            onChange={e => setWalkInForm({...walkInForm, price: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                        />
                    </div>
                    
                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowWalkInModal(false)}
                            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20"
                        >
                            ยืนยันการจอง
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}