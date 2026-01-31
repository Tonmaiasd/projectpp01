import { useRef, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabase/client";
import { AuthContext } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import {
  User, Mail, Phone, MapPin, Edit2,
  History, Calendar, Clock, Scissors,
  LogOut, Save, X, Camera, CheckCircle,
  XCircle, Clock4, Filter, AlertCircle, CalendarClock, Link, MessageSquare, Trash2
} from "lucide-react";

export default function Profile() {
  const fileInputRef = useRef(null);
  const { user, logout } = useContext(AuthContext);

  // LIFF ID - Replace with your actual LIFF ID
  const LIFF_ID = "2008933197-lBD8ZDCI";

  // --- LIFF State Management ---
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [liffLoading, setLiffLoading] = useState(true);
  const [lineUserId, setLineUserId] = useState(null);
  const [profileLineId, setProfileLineId] = useState(null); // Line ID from Supabase Profile
  const [showLinkNotice, setShowLinkNotice] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');

  // --- Reschedule State Management ---
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    bookingId: null,
    date: '',
    time: '',
    serviceName: '',
    currentDate: '',
    currentTime: '',
    maxDate: ''
  });
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState([]);
  const [rescheduleAdminBusySlots, setRescheduleAdminBusySlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // --- Cancellation State Management ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // --- Save Confirmation State ---
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    // ไม่ auto close เพื่อให้ user อ่านข้อความได้ชัดเจน
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('notice') === 'link_line') {
      setShowLinkNotice(true);
    }
  }, []);

  // --- State Management ---
  const [isEditing, setIsEditing] = useState(false);
  const [filterType, setFilterType] = useState('All'); // ตัวเลือกกรอง: All, Upcoming, History
  const [bookings, setBookings] = useState([]); // New state for bookings
  const [historyPage, setHistoryPage] = useState(1); // Pagination for history

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address, avatar_url, line_user_id')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const initialProfile = {
        fullName: data?.full_name || user.user_metadata?.name || 'New User',
        email: user.email || '',
        phone: data?.phone || user.user_metadata?.phone || '',
        address: data?.address || 'Please update your address',
        avatar: data?.avatar_url || user.user_metadata?.avatar_url || "/default-avatar.png"
      };
      setProfile(initialProfile);
      setFormData(initialProfile);
      setProfileLineId(data?.line_user_id || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      showNotification("Error fetching profile: " + error.message, "error");
    }
  }, [user]);

  const fetchBookings = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setBookingLoading(true);
    setBookingError(null);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      if (!isSilent) setBookingError("Error fetching bookings: " + error.message);
    } finally {
      if (!isSilent) setBookingLoading(false);
    }
  }, [user]);
  const [bookingLoading, setBookingLoading] = useState(true); // New state for booking loading
  const [bookingError, setBookingError] = useState(null); // New state for booking error

  // The user's profile data will be a combination of the auth user and their metadata
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    avatar: "/default-avatar.png"
  });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [formData, setFormData] = useState(profile);

  // --- LIFF SDK Initialization ---
  useEffect(() => {
    const loadLiffSdk = () => {
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'; // Latest LIFF SDK via edge path
      script.async = true;
      script.onload = async () => {
        try {
          await window.liff.init({ liffId: LIFF_ID });
          setLiffInitialized(true);
        } catch (err) {
          console.error("LIFF SDK auto-init failed:", err);
        } finally {
          setLiffLoading(false);
        }
      };
      script.onerror = () => {
        console.error("Failed to load LIFF SDK.");
        setLiffLoading(false);
      };
      document.body.appendChild(script);
    };

    if (user) {
      loadLiffSdk();
    }
  }, [user]);

  // Handle Automatic Linking after redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && liffInitialized && user && !profileLineId) {
      handleLinkLineAccount();
    }
  }, [liffInitialized, user, profileLineId]);

  // --- Initialize LIFF and get profile ---
  const handleLinkLineAccount = async () => {
    if (!liffInitialized || !window.liff) {
      showNotification("LIFF SDK ยังไม่พร้อมใช้งาน", "warning");
      return;
    }

    try {
      await window.liff.init({ liffId: LIFF_ID });

      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href }); // Explicitly return to current page
        return;
      }

      const liffProfile = await window.liff.getProfile(); // Fixed redundant .liff call
      setLineUserId(liffProfile.userId);
      showNotification(`เชื่อมต่อ LINE สำเร็จแล้วครับ!`, "success");

      // Send to backend to link with Supabase profile
      await linkLineIdToSupabase(liffProfile.userId);

    } catch (err) {
      console.error("LIFF initialization or login failed:", err);
      showNotification("ไม่สามารถเชื่อมต่อ LINE ได้: " + err.message, "error");
    }
  };

  // --- Backend call to link Line ID with Supabase Profile ---
  const linkLineIdToSupabase = async (id) => {
    if (!user || !id) return;

    try {
      const response = await fetch('http://localhost:3001/api/link-line-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}` // Use Supabase user ID as a token for this request
        },
        body: JSON.stringify({ supabaseUserId: user.id, lineUserId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link LINE ID');
      }

      const result = await response.json();
      setProfileLineId(id); // Update local state if successful
      showNotification(result.message, "success");
    } catch (error) {
      console.error('Error linking LINE ID:', error);
      showNotification('ไม่สามารถเชื่อมโยง LINE ID กับโปรไฟล์ได้: ' + error.message, "error");
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();


      fetchBookings();

      // --- REALTIME SUBSCRIPTION ---
      const channel = supabase
        .channel('profile-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => {
            console.log('Real-time update received:', payload);
            fetchBookings(true);
            setRefreshToggle(prev => prev + 1); // Also refresh availability if modal is open
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_busy_times' },
          () => {
            setRefreshToggle(prev => prev + 1);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const emptyProfile = {
        fullName: "", email: "", phone: "", address: "",
        avatar: "/default-avatar.png"
      };
      setProfile(emptyProfile);
      setFormData(emptyProfile);
      setBookings([]);
      setBookingLoading(false);
    }
  }, [user, fetchProfile, fetchBookings]);

  // Fetch availability for rescheduling
  useEffect(() => {
    if (rescheduleData.date) {
      const fetchAvailability = async () => {
        try {
          // 1. Fetch normal bookings
          const { data: bData, error: bError } = await supabase
            .from('bookings')
            .select('booking_time')
            .eq('booking_date', rescheduleData.date)
            .in('status', ['Pending', 'Confirmed']);

          if (bError) throw bError;
          setRescheduleBookedSlots(bData.map(b => b.booking_time));

          // 2. Fetch admin busy times
          const { data: busyData, error: busyError } = await supabase
            .from('admin_busy_times')
            .select('*')
            .eq('busy_date', rescheduleData.date);

          if (busyError) {
            console.error('Error fetching busy slots:', busyError);
          } else {
            setRescheduleAdminBusySlots(busyData || []);
          }
        } catch (err) {
          console.error('Error fetching slots:', err);
        }
      };
      fetchAvailability();
    }
  }, [rescheduleData.date, refreshToggle]);

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

  // Logic การกรองข้อมูลแยกตามสถานะ
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed');
  }, [bookings]);

  const pastBookings = useMemo(() => {
    return bookings.filter(b => {
      const isPast = b.status === 'Completed' || b.status === 'Cancelled';
      if (!isPast) return false;

      if (filterType === 'Upcoming') return b.status === 'Completed';
      if (filterType === 'History') return b.status === 'Cancelled';
      return true; // All Past
    });
  }, [bookings, filterType]);

  // Pagination for history
  const ITEMS_PER_PAGE = 5;
  const totalHistoryPages = Math.max(1, Math.ceil(pastBookings.length / ITEMS_PER_PAGE));
  const paginatedPastBookings = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return pastBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [pastBookings, historyPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setHistoryPage(1);
  }, [filterType]);

  // --- Handlers ---
  // const handleLogout = async () => {
  //   if (window.confirm("ยืนยันการออกจากระบบ?")) {
  //     await logout();
  //     // Navigate will be handled by ProtectedRoute or can be done explicitly
  //   }
  // };

  const handleEditClick = () => {
    setFormData(profile);
    setIsEditing(true);
  };

  // ฟังก์ชันเปิด modal ยืนยันการบันทึก
  const handleSaveClick = () => {
    const phone = (formData.phone || '').toString().trim();

    // Validate phone length and digits
    if (phone && !/^\d{10}$/.test(phone)) {
      showNotification('เบอร์โทรต้องเป็นตัวเลข 10 หลักเท่านั้น', 'error');
      return;
    }

    // เปิด modal ยืนยัน
    setShowSaveConfirmModal(true);
  };

  // ฟังก์ชันบันทึกข้อมูลจริง
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const phone = (formData.phone || '').toString().trim();

      // ส่งคำขอไปที่ Server API เพื่ออัปเดตข้อมูลและเบอร์โทร Login
      const response = await fetch('http://localhost:3001/api/user-update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          phone: phone,
          full_name: formData.fullName,
          address: formData.address
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server error');
      }

      // Success - อัปเดตข้อมูลในหน้าจอ
      const updatedData = result.data;

      // ตรวจสอบว่ามีการเปลี่ยนเบอร์โทรหรือไม่ (ก่อนอัปเดต state)
      const phoneChanged = profile.phone !== updatedData.phone;

      setProfile({
        ...profile,
        fullName: updatedData.full_name,
        phone: updatedData.phone,
        address: updatedData.address
      });
      setFormData(prev => ({
        ...prev,
        fullName: updatedData.full_name,
        phone: updatedData.phone,
        address: updatedData.address
      }));

      setIsEditing(false);
      setShowSaveConfirmModal(false);

      // แสดงข้อความตามการเปลี่ยนแปลง
      if (phoneChanged) {
        showNotification(
          'บันทึกข้อมูลสำเร็จ!\n\nกรุณาใช้เบอร์โทรศัพท์ใหม่ในการ Login ครั้งถัดไป',
          'success'
        );
      } else {
        showNotification('บันทึกข้อมูลเรียบร้อย!', 'success');
      }
    } catch (error) {
      setShowSaveConfirmModal(false);
      showNotification('เกิดข้อผิดพลาด: ' + (error?.message || error), 'error');
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarClick = () => {
    if (!avatarUploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    try {
      // ใช้ user.id + เวลา เพื่อให้ชื่อไฟล์ไม่ซ้ำ
      // บรรทัดที่ 421-423 เดิม
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // *** เปลี่ยนจาก `avatars/${fileName}` เป็น fileName เฉยๆ ***

      const { error: uploadError } = await supabase.storage
        .from('avatars') // ระบุชื่อ Bucket ที่นี่แล้ว
        .upload(filePath, file, { // filePath ไม่ต้องมีชื่อ bucket ซ้ำ
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('ไม่สามารถสร้าง URL ของรูปโปรไฟล์ได้');
      }

      // อัปเดตตาราง profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // อัปเดต state ในหน้าให้แสดงรูปใหม่ทันที
      setProfile(prev => ({ ...prev, avatar: publicUrl }));
      setFormData(prev => ({ ...prev, avatar: publicUrl }));

      showNotification("อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว!", "success");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotification("ไม่สามารถอัปโหลดรูปโปรไฟล์ได้: " + error.message, "error");
    } finally {
      setAvatarUploading(false);
      // reset input value เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
      event.target.value = '';
    }
  };

  // ฟังก์ชันสำหรับขอเลื่อนคิว (เปิด Modal)
  const handleRescheduleRequest = (booking) => {
    // คำนวณวันที่มากที่สุดที่เลื่อนได้ (7 วันจากวันนี้)
    const today = new Date();
    const max = new Date(today);
    max.setDate(today.getDate() + 7);
    const maxDateStr = max.toISOString().split('T')[0];

    setRescheduleData({
      bookingId: booking.id,
      date: booking.booking_date || today.toISOString().split('T')[0],
      time: '',
      serviceName: booking.service_name,
      currentDate: booking.booking_date,
      currentTime: booking.booking_time,
      maxDate: maxDateStr
    });
    setShowRescheduleModal(true);
  };

  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    setCancelLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingToCancel.id,
          customerName: bookingToCancel.customer_name || profile.fullName,
          serviceName: bookingToCancel.service_name,
          bookingDate: bookingToCancel.booking_date,
          bookingTime: bookingToCancel.booking_time
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to cancel booking');
      }

      showNotification("ยกเลิกการจองเรียบร้อยแล้ว!", "success");
      setShowCancelModal(false);
      fetchBookings(true); // Immediate local refresh
      setRefreshToggle(prev => prev + 1);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      showNotification(err.message || "ไม่สามารถยกเลิกการจองได้", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      showNotification("กรุณาเลือกวันที่และเวลาใหม่", "warning");
      return;
    }

    setRescheduleLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/reschedule-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: rescheduleData.bookingId,
          newDate: rescheduleData.date,
          newTime: rescheduleData.time,
          oldDate: rescheduleData.currentDate,
          oldTime: rescheduleData.currentTime,
          serviceName: rescheduleData.serviceName
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reschedule');
      }

      showNotification("เลื่อนคิวจองและส่งแจ้งเตือน LINE เรียบร้อยแล้ว!", "success");
      setShowRescheduleModal(false);
      setRefreshToggle(prev => prev + 1);

      fetchBookings(true);
    } catch (err) {
      console.error("Error rescheduling:", err);
      showNotification(err.message || "ไม่สามารถเลื่อนคิวได้", "error");
    } finally {
      setRescheduleLoading(false);
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
          text: "รอรับการแจ้งเตือนเมื้อถึงคิว",
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

  const renderBookingItem = (booking) => {
    const statusInfo = getStatusDisplay(booking.status);
    return (
      <div key={booking.id} className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors shrink-0">
            <Scissors size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-lg text-white group-hover:text-amber-500 transition-colors">{booking.service_name}</h4>
              <span className="text-xs text-zinc-500 font-num">#{booking.id}</span>
            </div>
            <p className="text-zinc-400 text-sm mb-2">โดยช่าง: <span className="text-white">{booking.barber_name}</span></p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1 font-num bg-zinc-900 px-2 py-1 rounded border border-white/5"><Calendar size={12} /> {booking.booking_date}</span>
              <span className="flex items-center gap-1 font-num bg-zinc-900 px-2 py-1 rounded border border-white/5"><Clock size={12} /> {booking.booking_time} น.</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.text}
            </span>
            <span className="text-xl font-bold font-num text-white">฿{booking.price}</span>
          </div>

          {/* ปุ่มเลื่อนคิว เฉพาะสถานะ Pending */}
          {booking.status === 'Pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleRescheduleRequest(booking)}
                className="text-xs text-amber-500 hover:text-white flex items-center gap-1.5 transition-all border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 active:scale-95"
              >
                <CalendarClock size={14} /> เลื่อนคิวจอง
              </button>
              <button
                onClick={() => handleCancelBooking(booking)}
                className="text-xs text-red-500 hover:text-white flex items-center gap-1.5 transition-all border border-red-500/30 bg-red-500/5 px-3 py-1.5 rounded-lg hover:bg-red-500/20 active:scale-95"
              >
                <Trash2 size={14} /> ยกเลิก
              </button>
            </div>
          )}
        </div>
      </div>
    );
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

        {/* --- Link LINE Notice --- */}
        {showLinkNotice && !profileLineId && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 animate-pulse">
            <AlertCircle className="text-amber-500 shrink-0 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-amber-500 mb-1">กรุณาเชื่อมบัญชี LINE เพื่อจองคิว</h4>
              <p className="text-xs text-amber-400/80">ระบบต้องการการเชื่อมต่อกับ LINE ของคุณเพื่อส่งข้อความแจ้งเตือนคิว กรุณากดปุ่ม "เชื่อมต่อบัญชี LINE" ด้านล่างก่อนเริ่มการจองครับ</p>
            </div>
          </div>
        )}

        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <span className="text-amber-500 font-bold tracking-widest uppercase text-xs mb-2 block">My Account</span>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white flex items-center gap-3">
              ข้อมูลส่วนตัว
              <div
                className={`w-2.5 h-2.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                  realtimeStatus === 'error' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                    'bg-yellow-500 animate-pulse'
                  }`}
                title={realtimeStatus === 'connected' ? 'เชื่อมต่อ Real-time แล้ว' : realtimeStatus === 'error' ? 'การเชื่อมต่อขัดข้อง' : 'กำลังเชื่อมต่อ...'}
              />
            </h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* --- Left Column: Profile Card --- */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-amber-500/20 to-transparent"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className="w-32 h-32 rounded-full border-4 border-zinc-900 shadow-xl overflow-hidden mb-6 relative group cursor-pointer"
                  onClick={handleAvatarClick}
                  title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
                >
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">{profile.fullName}</h2>

                <div className="w-full space-y-4 text-left bg-zinc-950/50 p-6 rounded-2xl border border-white/5 mt-6">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold">เบอร์โทรศัพท์</p>
                      <p className="text-zinc-300 text-sm font-num">{profile.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold">ที่อยู่</p>
                      <p className="text-zinc-300 text-sm leading-relaxed">{profile.address}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleEditClick}
                  className="w-full mt-6 py-3 bg-zinc-800 hover:bg-amber-500 hover:text-black text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} /> แก้ไขข้อมูล
                </button>

                {/* Line Link Button */}
                {!profileLineId ? (
                  <button
                    onClick={handleLinkLineAccount}
                    disabled={liffLoading}
                    className="w-full mt-4 py-3 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Link size={18} /> เชื่อมต่อบัญชี LINE
                  </button>
                ) : (
                  <div className="w-full mt-4 py-3 bg-green-600/10 text-green-500 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-600/20">
                    <MessageSquare size={18} /> LINE ID เชื่อมต่อแล้ว ({profileLineId.substring(0, 10)}...)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- Right Column: Bookings & History --- */}
          <div className="lg:col-span-2 space-y-8">

            {/* --- Section 1: Active Bookings --- */}
            <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16 rounded-full"></div>

              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">รายการจอง</h3>
                  <p className="text-xs text-zinc-500">ติดตามสถานะและจัดการการจองของคุณ</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {bookingLoading ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-10 h-10 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin"></div>
                  </div>
                ) : activeBookings.length > 0 ? (
                  activeBookings.map((booking) => renderBookingItem(booking))
                ) : (
                  <div className="py-12 text-center bg-zinc-950/30 rounded-2xl border border-dashed border-white/5">
                    <p className="text-zinc-500 text-sm italic">ไม่มีรายการจองที่กำลังดำเนินการในขณะนี้</p>
                  </div>
                )}
              </div>
            </div>

            {/* --- Section 2: Booking History --- */}
            <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-xl overflow-hidden relative">

              {/* History Header & Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">ประวัติการจอง</h3>
                    <p className="text-xs text-zinc-500">รายการจองย้อนหลังทั้งหมด</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-start gap-2 p-1 bg-zinc-950 rounded-xl border border-white/5">
                  {['All', 'Upcoming', 'History'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterType(tab)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterType === tab
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                      {tab === 'All' ? 'ทั้งหมด' : tab === 'Upcoming' ? 'สำเร็จแล้ว' : 'ยกเลิก'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Past Bookings List */}
              <div className="space-y-4 relative z-10">
                {bookingLoading ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-10 h-10 border-2 border-white/10 border-t-zinc-500 rounded-full animate-spin"></div>
                  </div>
                ) : pastBookings.length > 0 ? (
                  <>
                    {paginatedPastBookings.map((booking) => renderBookingItem(booking))}
                    <Pagination
                      currentPage={historyPage}
                      totalPages={totalHistoryPages}
                      onPageChange={setHistoryPage}
                      itemsPerPage={ITEMS_PER_PAGE}
                      totalItems={pastBookings.length}
                    />
                  </>
                ) : (
                  <div className="py-12 text-center bg-zinc-950/30 rounded-2xl border border-dashed border-white/5">
                    <p className="text-zinc-500 text-sm italic">ไม่พบประวัติการจอง</p>
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
                <Edit2 className="text-amber-500" size={20} /> แก้ไขข้อมูลส่วนตัว
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
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-2 block">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // เอาเฉพาะตัวเลข
                    if (value.length <= 10) {
                      handleChange({ target: { name: 'phone', value } });
                    }
                  }}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="0812345678"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-num"
                />
                {formData.phone && formData.phone.length !== 10 && (
                  <p className="text-red-400 text-xs mt-2">⚠️ กรุณากรอกเบอร์โทรศัพท์ 10 หลัก</p>
                )}
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
              {/* --- NOTIFICATION MODAL --- */}
              {notification.show && (
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

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveClick}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> บันทึก
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- Save Confirmation Modal --- */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-8 text-center animate-[slideUp_0.3s_ease-out]">
            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>

            <h3 className="text-2xl font-serif font-bold text-white mb-2">ยืนยันการบันทึก?</h3>
            <p className="text-zinc-400 text-sm mb-2 leading-relaxed">
              คุณต้องการบันทึกข้อมูลส่วนตัวใหม่ใช่หรือไม่?
            </p>
            {profile.phone !== formData.phone && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 mt-4">
                <p className="text-amber-500 text-xs font-bold leading-relaxed">
                  ⚠️ คุณได้เปลี่ยนเบอร์โทรศัพท์<br />
                  กรุณาใช้เบอร์ใหม่ในการ Login ครั้งถัดไป
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    ยืนยันการบันทึก
                  </>
                )}
              </button>
              <button
                disabled={isSaving}
                onClick={() => setShowSaveConfirmModal(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold transition-all active:scale-95"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Reschedule Modal --- */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                <CalendarClock className="text-amber-500" size={24} /> เลื่อนคิวจอง
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Current Booking Summary */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-black shrink-0">
                  <Scissors size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-0.5">คิวปัจจุบันของคุณ</p>
                  <h4 className="text-white font-bold truncate">{rescheduleData.serviceName}</h4>
                  <p className="text-zinc-400 text-xs font-num">
                    {new Date(rescheduleData.currentDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} • {rescheduleData.currentTime} น.
                  </p>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                  <Calendar size={16} /> เลือกวันที่ต้องการเลื่อนไป
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  max={rescheduleData.maxDate}
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value, time: '' })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-amber-500 outline-none transition-all font-num scheme-dark"
                />
                <p className="text-[10px] text-amber-500/50 mt-1.5">* สามารถเลื่อนล่วงหน้าได้ไม่เกิน 7 วันครับ</p>
              </div>

              {/* Time Selection */}
              {rescheduleData.date && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <label className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
                    <Clock size={16} /> เลือกเวลาใหม่
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-62.5 overflow-y-auto pr-2 scrollbar-hide">
                    {timeSlots.map(slot => {
                      const isBooked = rescheduleBookedSlots.some(bTime => bTime && bTime.startsWith(slot));
                      const isBusy = rescheduleAdminBusySlots.some(busy => {
                        if (busy.is_full_day) return true;
                        return slot >= busy.start_time.slice(0, 5) && slot <= busy.end_time.slice(0, 5);
                      });
                      const isDisabled = isBooked || isBusy;

                      return (
                        <button
                          key={slot}
                          disabled={isDisabled}
                          onClick={() => setRescheduleData({ ...rescheduleData, time: slot })}
                          className={`py-2.5 rounded-xl text-sm font-num font-bold transition-all border ${rescheduleData.time === slot
                            ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105 z-10'
                            : isBusy
                              ? 'bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed opacity-40'
                              : isBooked
                                ? 'bg-amber-500/10 text-amber-500/50 border-amber-500/20 cursor-not-allowed opacity-40'
                                : 'bg-zinc-800 text-zinc-300 border-white/5 hover:border-amber-500/50 hover:text-white'
                            }`}
                        >
                          {isBusy ? 'ไม่ว่าง' : slot}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-3">* พักตามรอบการบริการของร้าน</p>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-4 flex gap-4">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  disabled={!rescheduleData.time || rescheduleLoading}
                  onClick={handleRescheduleSubmit}
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {rescheduleLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <>ยืนยันการเลื่อน</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Cancellation Modal --- */}
      {showCancelModal && bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-8 text-center animate-[slideUp_0.3s_ease-out]">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>

            <h3 className="text-2xl font-serif font-bold text-white mb-2">ยืนยันการยกเลิก?</h3>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              คุณต้องการยกเลิกการจอง <span className="text-white font-bold">{bookingToCancel.service_name}</span><br />
              ในวันที่ <span className="text-white font-num">{new Date(bookingToCancel.booking_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span> เวลา <span className="text-white font-num">{bookingToCancel.booking_time} น.</span> ใช่หรือไม่?
            </p>

            <div className="flex flex-col gap-3">
              <button
                disabled={cancelLoading}
                onClick={confirmCancelBooking}
                className="w-full py-4 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>ยืนยันการยกเลิก</>
                )}
              </button>
              <button
                disabled={cancelLoading}
                onClick={() => setShowCancelModal(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold transition-all active:scale-95"
              >
                ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
