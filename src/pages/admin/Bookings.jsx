import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { Search, Filter, MoreHorizontal, CheckCircle, XCircle, Clock, Calendar, X, Plus, CalendarClock, ArrowLeft, MessageSquareText, Check, AlertCircle } from 'lucide-react'; // เพิ่ม ArrowLeft
import { supabase } from '../../supabase/client';

export default function Bookings() {
  const navigate = useNavigate(); // 2. เรียกใช้ Hook
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notifyingNextQueue, setNotifyingNextQueue] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    if (type === 'success') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
    }
  };
  const [realtimeStatus, setRealtimeStatus] = useState('connecting'); // 'connecting', 'connected', 'error'

  // --- State สำหรับ Modal Walk-in ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ customer: '', service: '', date: new Date().toLocaleDateString('en-CA'), time: '09:30', price: 0 });

  // รายการเวลาที่มีให้เลือก (09:00 - 20:00 ทุก 30 นาที)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      const hStr = hour.toString().padStart(2, '0');
      slots.push(`${hStr}:00`);
      if (hour < 20) {
        slots.push(`${hStr}:30`);
      }
    }
    return slots;
  }, []);

  // ฟังก์ชันหาเวลาถัดไป (Next Slot) ทุก 30 นาที
  const getNextSlot = (currentTime) => {
    const [h, m] = currentTime.split(':').map(Number);
    if (m === 0) {
      return `${h.toString().padStart(2, '0')}:30`;
    } else {
      const nextHour = h + 1;
      return `${nextHour.toString().padStart(2, '0')}:00`;
    }
  };

  // 1. ข้อมูลการจองจาก Supabase
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);

  const fetchBookings = async (isSilent = false) => {
    if (!supabase) return;
    if (!isSilent) setLoading(true);
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      if (!isSilent) setLoading(false);
      return;
    }

    // Fetch profiles for bookings that have user_id
    const userIds = [...new Set(bookingsData.filter(b => b.user_id).map(b => b.user_id))];
    let profilesMap = {};

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds);

      if (profilesData) {
        profilesMap = profilesData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const data = bookingsData;

    // map ฟิลด์จาก DB ให้ตรงกับที่ UI ใช้
    const mapped = data.map((b) => ({
      id: b.id,
      customer: profilesMap[b.user_id]?.full_name || (b.user_id ? String(b.user_id).slice(0, 8) + '…' : b.customer_name || '-'),
      service: b.service_name,
      date: b.booking_date,
      time: b.booking_time,
      price: b.price,
      status: b.status,
      user_id: b.user_id,
      applied_promo: b.applied_promo,
    }));
    setBookings(mapped);
    if (!isSilent) setLoading(false);
  };

  const fetchServices = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data || []);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchServices();

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Realtime change received:', payload);
          fetchBookings(true); // Silent update
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. ฟังก์ชันอัปเดตสถานะ
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', id);
        if (error) throw error;
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id ? { ...booking, status: newStatus } : booking
        )
      );

    } catch (err) {
      console.error('Error updating status:', err);
      showNotification('ไม่สามารถอัปเดตสถานะได้', "error");
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

  // ฟังก์ชันเลื่อนคิว (Reschedule) - เลื่อนไป Slot ถัดไป
  const handleReschedule = (id) => {
    const targetBooking = bookings.find(b => b.id === id);
    if (!targetBooking) return;

    if (window.confirm(`ต้องการเลื่อนคิวของคุณ ${targetBooking.customer} และคิวถัดไปทั้งหมดไปยังรอบเวลาถัดไป ใช่หรือไม่?`)) {
      // คำนวณเวลาใหม่สำหรับรายการที่เลือก
      const newTime = getNextSlot(targetBooking.time);

      // อัปเดตรายการใน State (เพื่อให้ UI อัปเดตทันที)
      setBookings(prevBookings =>
        prevBookings.map(b => {
          // เลื่อนทุกคนที่จองวันเดียวกัน และเวลาตั้งแต่คิวที่เลือกเป็นต้นไป
          if (b.date === targetBooking.date && b.time >= targetBooking.time && b.status !== 'Cancelled') {
            // คำนวณระยะห่างเพื่อเลื่อนตามกันไป (ในระบบ Slot นี้เราจะเลื่อนไป 1 slot เหมือนกันหมด)
            return { ...b, time: getNextSlot(b.time) };
          }
          return b;
        })
      );

      // หมายเหตุ: ในระบบ Real-time ข้อมูลจะถูกดึงใหม่เมื่อมีการเปลี่ยนในฐานข้อมูล 
      // แต่ handleReschedule ตัวเดิมไม่ได้ทำการบันทึกลงฐานข้อมูล (เป็นการทดสอบ UI หรือ Logic เดิม?)
      // หากต้องการให้บันทึกจริง ต้องเรียก supabase.from('bookings').update(...) ด้วย
    }
  };

  // 3. ฟังก์ชันบันทึก Walk-in
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.customer || !walkInForm.service || !walkInForm.time || !walkInForm.price) {
      showNotification("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
      return;
    }

    const newBooking = {
      // schema ไม่มี customer_name -> เก็บชื่อไว้ที่ UI เท่านั้น (หรือถ้าต้องการเก็บจริง ต้องเพิ่มคอลัมน์ใน DB)
      user_id: null,
      service_name: walkInForm.service,
      booking_date: walkInForm.date,
      booking_time: walkInForm.time,
      price: Number(walkInForm.price),
      status: "Confirmed"
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('bookings')
          .insert([newBooking])
          .select('*')
          .single();
        if (error) throw error;

        // เพิ่มเข้าหน้า UI ทันที
        setBookings((prev) => [
          {
            id: data.id,
            customer: walkInForm.customer || '-',
            service: data.service_name,
            date: data.booking_date,
            time: data.booking_time,
            price: data.price,
            status: data.status,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error('Error inserting walk-in booking:', err);
      showNotification('ไม่สามารถบันทึกคิว Walk-in ได้', "error");
      return;
    }
    setShowWalkInModal(false);
    setWalkInForm({
      customer: '',
      service: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      price: ''
    });
    showNotification("เพิ่มคิว Walk-in เรียบร้อยแล้ว", "success");
  };

  // --- แจ้งเตือนคิวถัดไป (ระบบเลือกคนแรกที่รออยู่) ---
  const handleNotifyNextQueue = async () => {
    setNotifyingNextQueue(true);
    try {
      const response = await fetch('http://localhost:3001/api/next-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to notify next queue');

      showNotification(result.message, "success");
    } catch (error) {
      console.error('Error notifying next queue:', error);
      showNotification(error.message, "error");
    } finally {
      setNotifyingNextQueue(false);
    }
  };

  // --- แจ้งเตือนลูกค้ารายบุคคล (แอดมินเลือก) ---
  const handleNotifyBooking = async (bookingId) => {
    if (!bookingId) return;
    try {
      const response = await fetch('http://localhost:3001/api/notify-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: String(bookingId) }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to notify customer');

      showNotification(result.message, "success");
    } catch (error) {
      console.error('Error notifying customer:', error);
      showNotification(error.message, "error");
    }
  };

  // ฟังก์ชันกรองข้อมูล
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = filterStatus === 'All' || booking.status === filterStatus;
    const matchesSearch = booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(booking.id).toLowerCase().includes(searchTerm.toLowerCase());
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          {/* ปุ่มย้อนกลับไป Dashboard */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="กลับไปหน้า Dashboard"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col">
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              จัดการการจอง
              <div
                className={`w-2.5 h-2.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                  realtimeStatus === 'error' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                    'bg-yellow-500 animate-pulse'
                  }`}
                title={realtimeStatus === 'connected' ? 'เชื่อมต่อ Real-time แล้ว' : realtimeStatus === 'error' ? 'การเชื่อมต่อขัดข้อง' : 'กำลังเชื่อมต่อ...'}
              />
            </h1>
            <p className="text-zinc-400 text-sm">ตรวจสอบและจัดการคิวลูกค้าทั้งหมด</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* ปุ่ม "คิวถัดไป" */}
          <button
            onClick={() => handleNotifyNextQueue()}
            disabled={notifyingNextQueue}
            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-sky-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
          >
            {notifyingNextQueue ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                กำลังแจ้งเตือน...
              </span>
            ) : (
              <>
                <MessageSquareText size={18} /> แจ้งเตือนคิวถัดไป
              </>
            )}
          </button>

          {/* ปุ่มเปิด Modal */}
          <button
            onClick={() => setShowWalkInModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
          >
            <Plus size={18} /> จองคิวใหม่ (Walk-in)
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
          {['All', 'Pending', 'Completed', 'Cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filterStatus === status
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
                <th className="px-6 py-4 font-medium">ราคา</th>
                <th className="px-6 py-4 font-medium">Promotion</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-zinc-500">
                    กำลังโหลดข้อมูลการจอง...
                  </td>
                </tr>
              ) : filteredBookings.length > 0 ? (
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
                          <Calendar size={16} className="text-zinc-400" /> {booking.date}
                        </span>
                        <span className="text-amber-500 font-bold text-xl flex items-center gap-2 font-num mt-1 bg-amber-500/10 w-fit px-2 py-0.5 rounded">
                          <Clock size={18} /> {booking.time} น.
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-amber-500 font-bold text-lg font-num">฿{booking.price}</span>
                    </td>
                    <td className="px-6 py-4">
                      {booking.applied_promo ? (
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {booking.applied_promo}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">ไม่มี</span>
                      )}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                        {/* ปุ่มเลื่อนคิว (Reschedule) - สำหรับ Pending */}
                        {booking.status === 'Pending' && (
                          <button
                            onClick={() => handleReschedule(booking.id)}
                            title="เลื่อนคิว (ไปยังรอบถัดไป)"
                            className="p-2 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                          >
                            <CalendarClock size={18} />
                          </button>
                        )}

                        {/* ปุ่มแจ้งเตือนรายบุคคล */}
                        {booking.status === 'Pending' && (
                          <button
                            onClick={() => handleNotifyBooking(booking.id)}
                            title="ส่งแจ้งเตือนลูกค้า"
                            className="p-2 bg-sky-500/10 text-sky-500 rounded hover:bg-sky-500 hover:text-white transition-colors border border-sky-500/20"
                          >
                            <MessageSquareText size={18} />
                          </button>
                        )}

                        {/* ปุ่มเสร็จสิ้น (ไปที่ Completed และแจ้งคิวถัดไป) */}
                        {booking.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'Completed')}
                            title="เสร็จสิ้น/เช็คเอาท์"
                            className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors"
                          >
                            <Check size={18} />
                          </button>
                        )}

                        {/* ปุ่มยกเลิก (ไปที่ Cancelled และแจ้งคิวถัดไป) */}
                        {booking.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'Cancelled')}
                            title="ยกเลิก"
                            className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-zinc-500">
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
                <Plus size={20} className="text-amber-500" /> เพิ่มคิว Walk-in
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
                  onChange={e => setWalkInForm({ ...walkInForm, customer: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">บริการ</label>
                <select
                  required
                  value={walkInForm.service}
                  onChange={e => {
                    const selectedService = services.find(s => s.name === e.target.value);
                    setWalkInForm({
                      ...walkInForm,
                      service: e.target.value,
                      price: selectedService?.price || walkInForm.price
                    });
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                >
                  <option value="">-- เลือกบริการ --</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.name}>
                      {service.name} - ฿{service.price}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">วันที่</label>
                  <input
                    type="date"
                    required
                    value={walkInForm.date}
                    onChange={e => setWalkInForm({ ...walkInForm, date: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-zinc-400 mb-3 block">เลือกเวลา</label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setWalkInForm({ ...walkInForm, time: slot })}
                        className={`py-2 rounded-lg text-xs font-num font-bold border transition-all ${walkInForm.time === slot
                          ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-950 text-zinc-400 border-white/5 hover:border-amber-500/50'
                          }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">ราคา (บาท)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={walkInForm.price}
                  onChange={e => setWalkInForm({ ...walkInForm, price: e.target.value })}
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

      {/* --- NOTIFICATION MODAL --- */}
      {notification.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => setNotification({ ...notification, show: false })}></div>
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 p-8 text-center relative z-10 animate-[slideUp_0.3s_ease-out]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${notification.type === 'error' ? 'bg-red-500/20 text-red-500' :
              notification.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                'bg-green-500/20 text-green-500'
              }`}>
              {notification.type === 'error' ? <XCircle className="w-8 h-8" /> :
                notification.type === 'warning' ? <AlertCircle className="w-8 h-8" /> :
                  <CheckCircle className="w-8 h-8" />}
            </div>
            <h4 className="text-xl font-bold text-white mb-2">
              {notification.type === 'error' ? 'เกิดข้อผิดพลาด' :
                notification.type === 'warning' ? 'แจ้งเตือน' :
                  'สำเร็จ'}
            </h4>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 whitespace-pre-wrap">{notification.message}</p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${notification.type === 'error' ? 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20' :
                'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}