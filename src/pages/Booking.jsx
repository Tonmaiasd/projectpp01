import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { AuthContext } from '../context/AuthContext';
import { io } from "socket.io-client";
import Pagination from '../components/Pagination';
import { formatDate } from '../utils/formatDate';
import {
  Search, SlidersHorizontal, Star, Clock,
  Sparkles, X, ChevronRight,
  User, Calendar, CheckCircle, MessageCircle, ArrowLeft, AlertCircle, XCircle
} from 'lucide-react';

export default function Booking() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);


  // --- State Management ---
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [packages, setPackages] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [usedPromoCodes, setUsedPromoCodes] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State สำหรับการจอง (Booking Modal)
  const [bookingStep, setBookingStep] = useState('select'); // 'line_qr' | 'select' | 'confirm' | 'success'
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    name: '',
    tel: ''
  });
  const [createdBooking, setCreatedBooking] = useState(null); // เก็บข้อมูลคิวที่สร้างแล้ว ไว้ส่งแจ้งเตือนตอนกด "จองเสร็จสิ้น"
  const [bookedSlots, setBookedSlots] = useState([]);
  const [adminBusySlots, setAdminBusySlots] = useState([]);
  const [servicesPage, setServicesPage] = useState(1); // Pagination for services
  const [skipLineStep, setSkipLineStep] = useState(() => {
    return localStorage.getItem('skipLineStep') === 'true';
  }); // Toggle to skip LINE QR step

  // Fetch booked slots for the selected date
  const fetchBookedAndBusySlots = async () => {
    if (!bookingData.date) return;
    try {
      // 1. Fetch normal bookings (Pending, Confirmed, and Completed block slots)
      const { data: bData, error: bError } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('booking_date', bookingData.date)
        .in('status', ['Pending', 'Confirmed', 'Completed']);

      if (bError) throw bError;
      setBookedSlots(bData.map(b => b.booking_time));

      // 2. Fetch admin busy times
      const { data: busyData, error: busyError } = await supabase
        .from('admin_busy_times')
        .select('*')
        .eq('busy_date', bookingData.date);

      if (busyError) {
        console.error('Error fetching busy slots:', busyError);
      } else {
        setAdminBusySlots(busyData || []);
      }

    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  };

  useEffect(() => {
    fetchBookedAndBusySlots();

    // --- REAL-TIME SUBSCRIPTION ---
    const channel = supabase
      .channel('booking-slots-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchBookedAndBusySlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingData.date]);

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

  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    if (type === 'success') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
    }
  };

  // --- Data Fetching ---
  // Helper function to fetch services
  const fetchServices = async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*');

      clearTimeout(timeoutId);

      if (error) {
        console.error('❌ Services fetch error:', error);
        setError('Failed to load services: ' + error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('❌ No data returned');
        setError('No data returned from server');
        setLoading(false);
        return;
      }


      const mappedData = data.map(service => ({
        ...service,
        duration: service.duration_minutes,
        img: service.img_url,
        desc: service.description,
        includes: service.description?.split(', ') || []
      }));

      setPackages(mappedData);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("❌ Error fetching services:", err);
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  // Fetch services and promotions on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchServices(),
        fetchPromotions()
      ]);
      setLoading(false);
    };

    fetchInitialData();

    // --- SOCKET.IO REALTIME NOTIFICATION ---
    const socket = io("http://localhost:3001");
    socket.on("servicesUpdate", () => {
      console.log('✨ Socket.io: Received servicesUpdate, fetching updated services...');
      fetchServices();
    });

    return () => {
      socket.off("servicesUpdate");
      socket.disconnect();
    };
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired promotions (Client-side double check
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const validPromotions = (data || []).filter(p => !p.expire_date || p.expire_date >= todayStr);

      setPromotions(validPromotions);
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
  };

  // ดึง user profile เมื่อ user เปลี่ยน
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, line_user_id')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Fetch used promotions
  useEffect(() => {
    if (!user) {
      setUsedPromoCodes([]);
      return;
    }
    const fetchUsedPromos = async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('applied_promo')
          .eq('user_id', user.id)
          .neq('status', 'Cancelled')
          .not('applied_promo', 'is', null);

        if (data) {
          setUsedPromoCodes(data.map(d => d.applied_promo));
        }
      } catch (err) {
        console.error('Error fetching used promos:', err);
      }
    };
    fetchUsedPromos();
  }, [user]);

  // --- Functions ---

  //  กรองและเรียงลำดับข้อมูล
  const filteredPackages = packages
    .filter(pkg =>
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.desc && pkg.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // recommended (default order)
    });

  // Pagination for services
  const SERVICES_PER_PAGE = 5;
  const totalServicesPages = Math.max(1, Math.ceil(filteredPackages.length / SERVICES_PER_PAGE));
  const paginatedServices = useMemo(() => {
    const start = (servicesPage - 1) * SERVICES_PER_PAGE;
    return filteredPackages.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredPackages, servicesPage]);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setServicesPage(1);
  }, [searchQuery, sortBy]);

  // เปิด Modal เพื่อเริ่มการจอง
  const handleOpenBooking = (pkg) => {
    if (!user) {
      navigate("/login?redirect=booking");
      return;
    }

    const today = new Date().toLocaleDateString('en-CA');
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateStr = maxDate.toLocaleDateString('en-CA');

    // Pre-fill booking data with user's profile info from profiles table
    setBookingData({
      date: today,
      maxDate: maxDateStr,
      time: '',
      name: userProfile?.full_name || user.user_metadata?.name || '',
      tel: userProfile?.phone || user.user_metadata?.phone || ''
    });

    setSelectedPackage(pkg);
    // ตามคำขอ: ถ้า skipLineStep เป็น true ให้ข้ามไปเลือกเวลาเลย
    // ถ้าเป็น false ให้แสดงหน้าเพิ่มเพื่อนเสมอ (เพื่อให้ user เห็นหน้า QR ตามต้องการ)
    if (skipLineStep) {
      setBookingStep('select');
    } else {
      setBookingStep('line_qr');
    }
  };

  // ปิด Modal ทั้งหมด
  const closeAll = () => {
    setSelectedPackage(null);
    setSelectedPromotion(null);
    // ไม่รีเซ็ต skipLineStep เพื่อให้ค่าที่ user เลือกยังคงอยู่
    // เมื่อเปิดใหม่ครั้งหน้า จะเช็คค่านี้ใน handleOpenBooking เอง
    setBookingStep('select');
    setBookingData({ date: '', time: '', name: '', tel: '' });
    setCreatedBooking(null);
  };

  // คำนวณราคาสุทธิ
  const finalPrice = useMemo(() => {
    if (!selectedPackage) return 0;
    if (!selectedPromotion) return selectedPackage.price;

    const discountText = selectedPromotion.discount_text || '';
    let discount = 0;

    if (discountText.includes('%')) {
      const percent = parseInt(discountText.replace(/[^0-9]/g, ''));
      discount = (selectedPackage.price * percent) / 100;
    } else {
      discount = parseInt(discountText.replace(/[^0-9]/g, ''));
    }

    return Math.max(0, selectedPackage.price - discount);
  }, [selectedPackage, selectedPromotion]);

  // ยืนยันการจอง
  const confirmBooking = async () => {
    if (!bookingData.date || !bookingData.time) {
      showNotification("กรุณาระบุวันและเวลาที่ต้องการจอง", "warning");
      return;
    }

    if (!userProfile?.line_user_id) {
      showNotification("คุณยังไม่ได้เชื่อมต่อบัญชีกับ LINE เพื่อรับการแจ้งเตือนคิว ระบบจะพาคุณไปเชื่อมต่อในหน้าโปรไฟล์ก่อนครับ", "warning");
      setTimeout(() => navigate("/profile?notice=link_line"), 2000);
      return;
    }
    setBookingInProgress(true);
    try {
      // --- COLLISION CHECK (Double Booking Prevention) ---
      const { data: existing, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', bookingData.date)
        .eq('booking_time', bookingData.time)
        .in('status', ['Pending', 'Confirmed', 'Completed'])
        .maybeSingle();

      if (existing) {
        showNotification("ขออภัยครับ เวลานี้เพิ่งถูกจองไปเมื่อครู่ กรุณาเลือกเวลาอื่นแทนครับ", "warning");
        setBookingInProgress(false);
        // Refresh booked slots list
        const { data: newData } = await supabase
          .from('bookings')
          .select('booking_time')
          .eq('booking_date', bookingData.date)
          .in('status', ['Pending', 'Confirmed', 'Completed']);
        setBookedSlots(newData ? newData.map(b => b.booking_time) : []);
        return;
      }

      // --- USER LIMIT CHECK (1 Booking per day) ---
      const { data: userExisting, error: userCheckError } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('booking_date', bookingData.date)
        .neq('status', 'Cancelled');

      if (userCheckError) {
        console.error('Error checking user existing bookings:', userCheckError);
      }

      if (userExisting && userExisting.length > 0) {
        showNotification("คุณมีการจองในวันนี้อยู่แล้วครับ (จำกัด 1 ครั้งต่อวันต่อท่าน)", "warning");
        setBookingInProgress(false);
        return;
      }

      // --- PROMOTION USAGE CHECK (1 Time per Promotion per User) ---
      if (selectedPromotion) {
        const { data: usedPromo, error: promoError } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('applied_promo', selectedPromotion.code)
          .neq('status', 'Cancelled')
          .maybeSingle();

        if (promoError) {
          console.error('Error checking promotion usage:', promoError);
        }

        if (usedPromo) {
          showNotification(`คุณเคยใช้โปรโมชั่น "${selectedPromotion.code}" ไปแล้ว (จำกัด 1 ครั้งต่อท่าน)`, "warning");
          setBookingInProgress(false);
          return;
        }
      }

      // 1) บันทึกลง Supabase
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            customer_name: bookingData.name || userProfile?.full_name || user.user_metadata?.name || '',
            service_name: selectedPackage.name,
            barber_name: null, // จะกำหนดช่างภายหลัง
            booking_date: bookingData.date,
            booking_time: bookingData.time,
            price: finalPrice,
            applied_promo: selectedPromotion?.code || null,
            status: 'Pending',
            reschedule_count: 0,
            update_count: 0
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      // 2) เก็บข้อมูลคิวที่สร้างแล้ว เพื่อใช้แสดงในหน้า Success (ถ้าจำเป็น)
      setCreatedBooking({
        id: data.id,
        customer_name: bookingData.name || userProfile?.full_name || user.user_metadata?.name || '',
        service_name: data.service_name,
        booking_date: data.booking_date,
        booking_time: data.booking_time,
        price: data.price,
        status: data.status,
      });

      // 3) ส่งแจ้งเตือนไปยัง LINE ทันที
      fetch('http://localhost:3001/api/line/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: data.id,
          customer_name: data.customer_name,
          service_name: data.service_name,
          booking_date: data.booking_date,
          booking_time: data.booking_time,
          price: data.price,
          status: data.status,
        }),
      }).catch(err => console.warn('LINE Notify background error:', err));

      // --- SOCKET.IO REALTIME NOTIFICATION ---
      const socket = io("http://localhost:3001");
      socket.emit("bookingUpdate");
      setTimeout(() => socket.disconnect(), 1000);

      setBookingStep('success');
    } catch (error) {
      showNotification('Error creating booking: ' + error.message, "error");
      console.error('Error creating booking:', error);
    } finally {
      setBookingInProgress(false);
    }
  };

  // เมื่อผู้ใช้กด "จองเสร็จสิ้น" ปิด Modal (แจ้งเตือนถูกส่งไปแล้วตอนกด ยืนยันการจอง)
  const handleFinishBooking = () => {
    closeAll();
    navigate('/profile');
  };

  // Auto-deselect promotion if booking date changes to be after promotion expiry
  useEffect(() => {
    if (selectedPromotion && selectedPromotion.expire_date && bookingData.date) {
      if (selectedPromotion.expire_date < bookingData.date) {
        setSelectedPromotion(null);
        showNotification(`โปรโมชั่น ${selectedPromotion.code} หมดเขตก่อนวันที่คุณเลือก`, 'warning');
      }
    }
  }, [bookingData.date, selectedPromotion]);

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

          <h1 className="text-3xl font-serif font-bold text-white">
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
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-all ${sortBy === opt.id
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
      <main className="max-w-8xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-2xl font-bold text-zinc-300">รายการแพ็คเกจ (<span className="font-num">{filteredPackages.length}</span>)</h2>
        </div>

        {/* Loading / Error / Empty states */}
        {loading && (
          <div className="text-center py-16 text-zinc-500">
            กำลังโหลดรายการแพ็คเกจ...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4">
            <div className="font-bold mb-1">โหลดรายการแพ็คเกจไม่สำเร็จ</div>
            <div className="text-sm wrap-break-word">{error}</div>
          </div>
        )}

        {!loading && !error && packages.length === 0 && (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 text-zinc-300">
            <div className="font-bold text-white mb-2">ยังไม่มีรายการแพ็คเกจในระบบ</div>
            <div className="text-sm text-zinc-400 leading-relaxed">
              ให้เพิ่มข้อมูลในตาราง <span className="font-mono">services</span> ที่ Supabase ก่อน
              (เช่น เพิ่มผ่านหน้า <span className="font-mono">/admin/services</span> หรือรันไฟล์ <span className="font-mono">seed-services.sql</span> ใน Supabase SQL Editor)
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate('/admin/services')}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors"
              >
                ไปหน้าเพิ่มบริการ
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
              >
                โหลดใหม่
              </button>
            </div>
          </div>
        )}

        {!loading && !error && packages.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedServices.map((pkg) => (
                <div key={pkg.id} className="bg-zinc-900 rounded-3xl p-4 shadow-xl hover:shadow-amber-500/10 transition-all duration-300 group border border-white/10 flex flex-col h-full hover:border-amber-500/30">
                  {/* Image Area */}
                  <div className="relative h-85 rounded-2xl overflow-hidden mb-4 bg-zinc-800">
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
                  <div className="grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-serif font-bold text-2xl text-white leading-tight mb-1 group-hover:text-amber-500 transition-colors">{pkg.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
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
            <Pagination
              currentPage={servicesPage}
              totalPages={totalServicesPages}
              onPageChange={setServicesPage}
              itemsPerPage={SERVICES_PER_PAGE}
              totalItems={filteredPackages.length}
            />
          </>
        )}
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
              <div className="flex items-center gap-3">
                {bookingStep !== 'success' && (
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase hidden sm:inline">ข้ามหน้า QR</span>
                    <button
                      onClick={() => {
                        const nextVal = !skipLineStep;
                        setSkipLineStep(nextVal);
                        localStorage.setItem('skipLineStep', nextVal);
                        // เปลี่ยนหน้าทันทีตามค่า Toggle
                        if (nextVal) {
                          setBookingStep('select');
                        } else {
                          setBookingStep('line_qr');
                        }
                      }}
                      className={`w-10 h-5 rounded-full relative transition-all duration-300 ${skipLineStep ? 'bg-amber-500' : 'bg-zinc-700'}`}
                      title="เปิด/ปิด การแสดงหน้าสแกน QR Code"
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${skipLineStep ? 'translate-x-5' : ''}`}></div>
                    </button>
                  </div>
                )}
                {bookingStep !== 'success' && (
                  <button
                    onClick={closeAll}
                    className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-0 bg-zinc-950">

              {/* STEP 0: Scan LINE QR Code */}
              {bookingStep === 'line_qr' && (
                <div className="p-8 text-center bg-zinc-950 min-h-[400px] flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
                  <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
                    <MessageCircle className="w-10 h-10 text-amber-500" />
                  </div>
                  <h4 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">เพิ่มเพื่อนก่อนจอง</h4>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                    กรุณาสแกน QR Code เพื่อเพิ่มเพื่อนใน LINE รับการแจ้งเตือนสถานะคิวและการจองของคุณ
                  </p>

                  <div className="relative group">
                    <div className="absolute -inset-4 bg-linear-to-tr from-amber-500 to-amber-200 rounded-4xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-white p-4 rounded-3xl shadow-2xl border-4 border-amber-500/20">
                      <img
                        src="/line-oa-qr.png"
                        alt="LINE OA QR Code"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                  </div>

                  <p className="mt-8 text-amber-500 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> เพิ่มเพื่อนแล้วกดปุ่ม "ไปต่อเพื่อเลือกเวลา"
                  </p>
                </div>
              )}

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
                      <label className="text-sm font-bold text-zinc-400 mb-2 block items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" /> วันที่
                      </label>
                      <input
                        type="date"
                        value={bookingData.date}
                        min={new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        max={bookingData.maxDate}
                        onChange={(e) => {
                          setBookingData({ ...bookingData, date: e.target.value });
                        }}
                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none text-white scheme-dark font-num"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" /> เลือกเวลาที่ต้องการ
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((slot) => {
                          const isBooked = bookedSlots.some(bTime => bTime && bTime.startsWith(slot));

                          // Check if admin is busy in this slot
                          const isAdminBusy = adminBusySlots.some(busy => {
                            return slot >= busy.start_time.slice(0, 5) && slot <= busy.end_time.slice(0, 5);
                          });

                          // --- PAST TIME CHECK ---
                          const now = new Date();
                          const todayStr = now.toLocaleDateString('en-CA');
                          const isToday = bookingData.date === todayStr;
                          const currentH = now.getHours();
                          const currentM = now.getMinutes();
                          const currentTimeStr = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
                          const isPast = isToday && slot <= currentTimeStr;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked || isAdminBusy || isPast}
                              onClick={() => setBookingData({ ...bookingData, time: slot })}
                              className={`py-2.5 rounded-xl text-sm font-num font-bold transition-all border ${bookingData.time === slot
                                ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                                : (isAdminBusy || isBooked)
                                  ? 'bg-red-500/10 text-red-500/80 border-red-500/20 cursor-not-allowed'
                                  : isPast
                                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 cursor-not-allowed opacity-60'
                                    : 'bg-zinc-800 text-zinc-300 border-white/5 hover:border-amber-500/50 hover:text-white'
                                }`}
                            >
                              {isAdminBusy ? 'ไม่ว่าง' : (isPast && !isBooked) ? 'เกินเวลาจอง' : slot}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">* พักตามรอบการบริการของร้าน</p>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div>
                      <label className="text-sm font-bold text-zinc-400 mb-2 block items-center gap-2">
                        <User className="w-4 h-4 text-amber-500" /> ชื่อผู้จอง
                      </label>
                      <input
                        type="text"
                        placeholder="ระบุชื่อของคุณ"
                        value={bookingData.name}
                        onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-zinc-600 text-white"
                      />
                    </div>
                  </div>

                  {/* Promotion Selector */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> โปรโมชั่น (ถ้ามี)
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPromotion(null)}
                        className={`p-4 rounded-2xl border text-left transition-all ${!selectedPromotion
                          ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                          : 'bg-zinc-800 text-zinc-400 border-white/5 hover:border-white/20'
                          }`}
                      >
                        <div className="font-bold">ไม่ใช้โปรโมชั่น</div>
                        <div className="text-xs opacity-70">จองราคาปกติ</div>
                      </button>

                      {promotions.map((promo) => {
                        const isUsed = usedPromoCodes.includes(promo.code);
                        // Check if promo expires before the selected booking date
                        // promo.expire_date is YYYY-MM-DD, bookingData.date is YYYY-MM-DD
                        const isExpiredForDate = promo.expire_date && promo.expire_date < bookingData.date;

                        const isDisabled = isUsed || isExpiredForDate;

                        return (
                          <button
                            key={promo.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && setSelectedPromotion(promo)}
                            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${isDisabled
                              ? 'opacity-40 cursor-not-allowed bg-zinc-900 border-white/5 grayscale saturate-0'
                              : selectedPromotion?.id === promo.id
                                ? 'bg-amber-500 text-black border-amber-500 shadow-lg'
                                : 'bg-zinc-800 text-zinc-300 border-white/5 hover:border-amber-500/50'
                              }`}
                          >
                            {isUsed && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-zinc-700 text-zinc-400 text-[10px] rounded-full font-bold">
                                ใช้แล้ว
                              </div>
                            )}
                            {isExpiredForDate && !isUsed && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] rounded-full font-bold border border-red-500/20">
                                หมดเขตก่อนวันจอง
                              </div>
                            )}
                            <div className="flex justify-between items-center relative z-10">
                              <div>
                                <div className="font-bold flex items-center gap-2">
                                  {promo.title}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedPromotion?.id === promo.id ? 'bg-black/20 border-black/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                                    {promo.code}
                                  </span>
                                </div>
                                <div className="text-xs mt-1 opacity-80">{promo.discount_text}</div>
                                {promo.expire_date && (
                                  <div className={`text-xs mt-1 ${isExpiredForDate ? 'text-red-500 font-bold' : 'opacity-60'}`}>
                                    หมดเขต: {formatDate(promo.expire_date)}
                                  </div>
                                )}
                              </div>
                              <div className={`text-lg font-bold ${selectedPromotion?.id === promo.id ? 'text-black' : 'text-amber-500'}`}>
                                {promo.discount_text}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Success - แสดง QR Code สำหรับเพิ่มเพื่อน */}
              {bookingStep === 'success' && (
                <div className="p-8 text-center bg-zinc-950 min-h-100 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out]">
                  <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
                    <CheckCircle className="w-10 h-10 text-amber-500" />
                  </div>
                  <h4 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">จองคิวสำเร็จ!</h4>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                    ขอบคุณที่ใช้บริการครับ เมื่อถึงคิวของท่านระบบจะแจ้งเตือนผ่าน LINE
                  </p>

                  {/* <div className="relative group">
                    <div className="absolute -inset-4 bg-linear-to-tr from-amber-500 to-amber-200 rounded-4xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative bg-white p-4 rounded-3xl shadow-2xl border-4 border-amber-500/20">
                    </div>
                  </div>

                  <p className="mt-8 text-amber-500 font-bold flex items-center gap-2 animate-bounce">
                    <Sparkles className="w-4 h-4" /> สแกนเพื่อเพิ่มเพื่อนรับการแจ้งเตือน
                  </p> */}
                </div>
              )}
            </div>

            {/* Modal Footer (Action Buttons) */}
            {
              bookingStep === 'line_qr' && (
                <div className="p-6 border-t border-white/10 bg-zinc-900">
                  <button
                    onClick={() => setBookingStep('select')}
                    className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-lg flex items-center justify-center gap-2"
                  >
                    ไปต่อเพื่อเลือกเวลา <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )
            }
            {
              bookingStep === 'select' && (
                <div className="p-6 border-t border-white/10 bg-zinc-900">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                      <span className="text-zinc-400 text-xs">ยอดรวมทั้งสิ้น</span>
                      {selectedPromotion && (
                        <span className="text-zinc-500 text-[10px] line-through decoration-zinc-600">฿{selectedPackage.price}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-bold text-amber-500 font-num">฿{finalPrice}</span>
                      {selectedPromotion && (
                        <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full mt-1">
                          ประหยัดไป {selectedPackage.price - finalPrice} บาท
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={confirmBooking}
                    disabled={bookingInProgress}
                    className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {bookingInProgress ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                  </button>
                </div>
              )
            }
            {
              bookingStep === 'success' && (
                <div className="p-6 border-t border-white/10 bg-zinc-900">
                  <button
                    onClick={handleFinishBooking}
                    className="w-full bg-amber-500 text-black py-4 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-lg"
                  >
                    จองเสร็จสิ้น
                  </button>
                </div>
              )
            }
          </div >
        </div >
      )
      }

      {/* --- NOTIFICATION MODAL --- */}
      {
        notification.show && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 sm:p-4">
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
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">{notification.message}</p>
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
        )
      }

    </div >
  );
}