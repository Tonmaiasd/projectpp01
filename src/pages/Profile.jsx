import { useRef, useContext, useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { AuthContext } from "../context/AuthContext";
import {
  User, Mail, Phone, MapPin, Edit2,
  History, Calendar, Clock, Scissors,
  LogOut, Save, X, Camera, CheckCircle,
  XCircle, Clock4, Filter, AlertCircle, CalendarClock, Link, MessageSquare
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

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    if (type === 'success') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
    }
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
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, phone, address, avatar_url, line_user_id') // Fetch line_user_id
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 is for no rows found

          const initialProfile = {
            fullName: data?.full_name || user.user_metadata?.name || 'New User',
            email: user.email || '',
            phone: data?.phone || user.user_metadata?.phone || '',
            address: data?.address || 'Please update your address',
            avatar: data?.avatar_url || user.user_metadata?.avatar_url || "/default-avatar.png"
          };
          setProfile(initialProfile);
          setFormData(initialProfile);
          setProfileLineId(data?.line_user_id || null); // Set existing line_user_id
        } catch (error) {
          console.error("Error fetching profile:", error);
          showNotification("Error fetching profile: " + error.message, "error");
        }
      };
      fetchProfile();

      const fetchBookings = async () => {
        setBookingLoading(true);
        setBookingError(null);
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .order('booking_date', { ascending: false })
            .order('booking_time', { ascending: false });

          if (error) throw error;
          setBookings(data);
        } catch (error) {
          console.error("Error fetching bookings:", error);
          setBookingError("Error fetching bookings: " + error.message);
        } finally {
          setBookingLoading(false);
        }
      };
      fetchBookings();
    } else {
      setProfile({
        fullName: "", email: "", phone: "", address: "",
        avatar: "/default-avatar.png"
      });
      setFormData(profile);
      setBookings([]);
      setBookingLoading(false);
    }
  }, [user]);

  // Logic การกรองข้อมูล
  const filteredBookings = bookings.filter(b => {
    if (filterType === 'Upcoming') {
      return b.status === 'Completed';
    }
    if (filterType === 'History') {
      return b.status === 'Cancelled';
    }
    return true; // All
  });

  // --- Handlers ---
  const handleLogout = async () => {
    if (window.confirm("ยืนยันการออกจากระบบ?")) {
      await logout();
      // Navigate will be handled by ProtectedRoute or can be done explicitly
    }
  };

  const handleEditClick = () => {
    setFormData(profile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update user_metadata in auth.users if needed, though 'profiles' table is preferred for public data
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: {
          name: formData.fullName,
          phone: formData.phone,
        }
      });

      if (userUpdateError) throw userUpdateError;

      setProfile(formData);
      setIsEditing(false);
      showNotification("บันทึกข้อมูลเรียบร้อย!", "success");
    } catch (error) {
      showNotification("Error saving profile: " + error.message, "error");
      console.error("Error saving profile:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    // TODO: Implement Supabase storage upload
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatar = reader.result;
        setProfile(prev => ({ ...prev, avatar: newAvatar }));
        setFormData(prev => ({ ...prev, avatar: newAvatar }));
      };
      reader.readAsDataURL(file);
      showNotification("อัปเดตรูปโปรไฟล์เรียบร้อย (ตัวอย่าง)", "success");
    }
  };

  // ฟังก์ชันสำหรับขอเลื่อนคิว
  const handleRescheduleRequest = (id) => {
    const newDate = prompt("ระบุวันที่และเวลาที่ต้องการขอเลื่อน (เช่น 01/01/2025 10:00 น.):");
    if (newDate) {
      showNotification(`ส่งคำขอเลื่อนคิวสำหรับ Booking #${id} เรียบร้อยแล้ว\nเราจะตรวจสอบและติดต่อกลับโดยเร็วที่สุดครับ`, "success");
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <span className="text-amber-500 font-bold tracking-widest uppercase text-xs mb-2 block">My Account</span>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white">ข้อมูลส่วนตัว</h1>
          </div>

          {showLinkNotice && !profileLineId && (
            <div className="md:col-span-1 bg-red-600/10 border border-red-600/20 p-4 rounded-2xl flex items-center gap-4 animate-[bounce_1s_infinite] shadow-lg shadow-red-600/10">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="text-white" size={20} />
              </div>
              <div>
                <h4 className="font-bold text-red-500">กรุณาเชื่อมต่อ LINE</h4>
                <p className="text-xs text-red-400/80">เพื่อให้ร้านค้าสามารถส่งการแจ้งเตือนคิวผ่าน LINE ให้คุณได้ครับ</p>
              </div>
            </div>
          )}

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
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">{profile.fullName}</h2>

                <div className="w-full space-y-4 text-left bg-zinc-950/50 p-6 rounded-2xl border border-white/5 mt-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 uppercase font-bold">อีเมล</p>
                      <p className="text-zinc-300 text-sm truncate">{profile.email}</p>
                    </div>
                  </div>
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

          {/* --- Right Column: Booking History --- */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10 shadow-xl min-h-[600px]">

              {/* History Header & Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <History className="text-amber-500" />
                  <h3 className="text-xl font-bold text-white">ประวัติการจอง</h3>
                </div>

                <div className="flex flex-wrap justify-start gap-2 p-1 bg-zinc-950 rounded-xl border border-white/5 max-w-full">
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

              {/* Booking List */}
              <div className="space-y-4">
                {bookingLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                    <p>กำลังโหลดรายการจอง...</p>
                  </div>
                ) : bookingError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-red-500">
                    <AlertCircle size={24} className="mb-4" />
                    <p>{bookingError}</p>
                    <p>ไม่สามารถโหลดรายการจองได้</p>
                  </div>
                ) : filteredBookings.length > 0 ? (
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
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors font-num"
                />
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