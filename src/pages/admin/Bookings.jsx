import React, { useState, useEffect, useMemo, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  X,
  Plus,
  CalendarClock,
  ArrowLeft,
  MessageSquareText,
  Check,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Trash2,
} from "lucide-react";
import { supabase } from "../../supabase/client";
import { AuthContext } from "../../context/AuthContext";
import { io } from "socket.io-client";
import SERVER_URL from "../../config/api";

export default function Bookings() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate(); // 2. เรียกใช้ Hook
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA'),
  );
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    if (type === "success") {
      setTimeout(
        () => setNotification((prev) => ({ ...prev, show: false })),
        3000,
      );
    }
  };
  const [realtimeStatus, setRealtimeStatus] = useState("connecting"); // 'connecting', 'connected', 'error'

  // --- State สำหรับ Modal Walk-in ---
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    customer: "",
    service: "",
    price: 0,
    date: new Date().toLocaleDateString('en-CA'),
    time: "09:30",
    phone: "",
  });

  // --- State สำหรับ Custom Confirmation Modal ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => { },
    type: "warning", // 'warning' | 'danger' | 'info'
  });

  // รายการเวลาที่มีให้เลือก (09:00 - 20:00 ทุก 30 นาที)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      const hStr = hour.toString().padStart(2, "0");
      slots.push(`${hStr}:00`);
    }
    return slots;
  }, []);

  // ฟังก์ชันหาเวลาถัดไป (Next Slot) ทุก 30 นาที
  const getNextSlot = (currentTime) => {
    const [h, m] = currentTime.split(":").map(Number);
    if (m === 0) {
      return `${h.toString().padStart(2, "0")}:30`;
    } else {
      const nextHour = h + 1;
      return `${nextHour.toString().padStart(2, "0")}:00`;
    }
  };

  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]); // Added state for promotions
  const [adminBusySlots, setAdminBusySlots] = useState([]); // Added state for admin busy times

  // Helper สำหรับเปรียบเทียบเวลา (HH:mm)
  const isTimeMatch = (timeA, timeB) => {
    if (!timeA || !timeB) return false;
    const normalize = (t) => t.split(":").slice(0, 2).join(":");
    return normalize(timeA) === normalize(timeB);
  };

  // Helper สำหรับดึง Booking ที่ "สำคัญที่สุด" ในกรณีที่มีหลายรายการในเวลาเดียวกัน
  const getPrioritizedBooking = (time) => {
    const relevantBookings = bookings.filter((b) => isTimeMatch(b.time, time));
    if (relevantBookings.length === 0) return null;

    // ลำดับความสำคัญ: Pending > Completed > Confirmed > Cancelled
    const priorityOrder = {
      Pending: 0,
      Completed: 1,
      Confirmed: 2,
      Cancelled: 3,
    };
    return relevantBookings.sort(
      (a, b) =>
        (priorityOrder[a.status] ?? 99) - (priorityOrder[b.status] ?? 99),
    )[0];
  };

  // Helper: เช็คว่า slot นี้ถูก admin ปิด/ไม่ว่างหรือไม่
  const isSlotBusy = (time) => {
    return adminBusySlots.some((busy) => {
      if (busy.is_full_day) return true;
      const normalize = (t) => t.split(":").slice(0, 2).join(":");
      const currentT = normalize(time);
      return (
        currentT >= normalize(busy.start_time) &&
        currentT <= normalize(busy.end_time)
      );
    });
  };

  // --- Reschedule Logic ---
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    bookingId: null,
    date: "",
    time: "",
    currentDate: "",
    currentTime: "",
    serviceName: "",
    maxDate: "",
  });
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState([]);
  const [rescheduleAdminBusySlots, setRescheduleAdminBusySlots] = useState([]);

  // --- Edit Booking Logic (New) ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editBookingData, setEditBookingData] = useState({
    id: null,
    service_name: "",
    applied_promo: "",
    price: 0,
    original_price: 0
  });

  const handleEdit = (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const originalService = services.find(s => s.name === booking.service);
    const originalPrice = originalService ? originalService.price : booking.price;

    setEditBookingData({
      id: booking.id,
      service_name: booking.service,
      applied_promo: booking.applied_promo || "",
      price: booking.price,
      original_price: originalPrice
    });
    setShowEditModal(true);
  };

  const calculateEditPrice = (serviceName, promoCode) => {
    const service = services.find(s => s.name === serviceName);
    if (!service) return 0;

    let price = service.price;
    const promo = promotions.find(p => p.code === promoCode);

    if (promo) {
      const discountText = promo.discount_text || '';
      let discount = 0;

      if (discountText.includes('%')) {
        const percent = parseInt(discountText.replace(/[^0-9]/g, ''));
        discount = (price * percent) / 100;
      } else {
        discount = parseInt(discountText.replace(/[^0-9]/g, ''));
      }
      price = Math.max(0, price - discount);
    }

    return price;
  };

  const handleEditSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsEditLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          service_name: editBookingData.service_name,
          applied_promo: editBookingData.applied_promo || null,
          price: editBookingData.price
        })
        .eq("id", editBookingData.id);

      if (error) throw error;

      showNotification("แก้ไขข้อมูลเรียบร้อยแล้ว", "success");
      setShowEditModal(false);
      fetchBookings();
    } catch (err) {
      console.error("Error updating booking:", err);
      showNotification("ไม่สามารถแก้ไขข้อมูลได้", "error");
    } finally {
      setIsEditLoading(false);
    }
  };

  // Open Reschedule Modal
  const handleReschedule = (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const today = new Date();
    const max = new Date(today);
    max.setDate(today.getDate() + 30); // Admin can reschedule up to 30 days

    setRescheduleData({
      bookingId: booking.id,
      date: booking.date, // Fix to the same day
      time: "",
      currentDate: booking.date,
      currentTime: booking.time,
      serviceName: booking.service,
    });

    setShowRescheduleModal(true);
  };

  // Fetch availability when date changes in Modal
  useEffect(() => {
    if (!showRescheduleModal || !rescheduleData.date) return;

    const fetchAvailability = async () => {
      // 1. Fetch Bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("booking_time, status")
        .eq("booking_date", rescheduleData.date)
        .in("status", ["Pending", "Confirmed", "Completed"]);

      const busyTimes = bookingsData
        ? bookingsData.map((b) => b.booking_time)
        : [];
      setRescheduleBookedSlots(busyTimes);

      // 2. Fetch Admin Busy Times
      const { data: busyData } = await supabase
        .from("admin_busy_times")
        .select("*")
        .eq("busy_date", rescheduleData.date);

      setRescheduleAdminBusySlots(busyData || []);
    };

    fetchAvailability();
  }, [rescheduleData.date, showRescheduleModal]);

  // Submit Reschedule (Admin Endpoint)
  const handleRescheduleSubmit = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      showNotification("กรุณาเลือกวันที่และเวลาใหม่", "warning");
      return;
    }

    setRescheduleLoading(true);
    try {
      const response = await fetch(
        `${SERVER_URL}/api/admin-reschedule-booking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: rescheduleData.bookingId,
            newDate: rescheduleData.date,
            newTime: rescheduleData.time,
            oldDate: rescheduleData.currentDate,
            oldTime: rescheduleData.currentTime,
            serviceName: rescheduleData.serviceName,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to reschedule");

      showNotification(result.message, "success");
      setShowRescheduleModal(false);
      fetchBookings(); // Refresh bookings
    } catch (err) {
      console.error("Error rescheduling:", err);
      showNotification(err.message || "ไม่สามารถเลื่อนคิวได้", "error");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const fetchBookings = useCallback(async (isSilent = false, isRealtimeEvent = false) => {
    if (!supabase) return;
    if (!isSilent) setLoading(true);

    try {
      // 1. Fetch Bookings
      let query = supabase
        .from("bookings")
        .select("*");

      // If realtime event, fetch wider date range (current month) to catch rescheduled bookings
      if (isRealtimeEvent) {
        const today = new Date(selectedDate);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split('T')[0];
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        query = query
          .gte("booking_date", monthStart)
          .lte("booking_date", monthEnd);
      } else {
        // Normal case: fetch only selected date
        query = query.eq("booking_date", selectedDate);
      }

      const { data: bookingsData, error: bError } = await query
        .order("booking_time", { ascending: true });

      if (bError) throw bError;

      // 2. Fetch Admin Busy Times
      const { data: busyData, error: busyError } = await supabase
        .from("admin_busy_times")
        .select("*")
        .eq("busy_date", selectedDate);

      if (busyError) {
        console.error("Error fetching busy slots:", busyError);
      } else {
        setAdminBusySlots(busyData || []);
      }

      // Fetch profiles for bookings that have user_id
      const userIds = [
        ...new Set(bookingsData.filter((b) => b.user_id).map((b) => b.user_id)),
      ];
      let profilesMap = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const mapped = bookingsData
        .filter((b) => !isRealtimeEvent || b.booking_date === selectedDate) // Filter to selected date if realtime
        .map((b) => ({
          id: b.id,
          customer:
            (b.user_id === user?.id)
              ? b.customer_name || "Walk-in"
              : profilesMap[b.user_id]?.full_name || b.customer_name || (b.user_id ? String(b.user_id).slice(0, 8) + "…" : "-"),
          service: b.service_name,
          date: b.booking_date,
          time: b.booking_time,
          price: b.price,
          status: b.status,
          user_id: b.user_id,
          applied_promo: b.applied_promo,
        }));
      setBookings(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error in fetchBookings:", err);
      showNotification("ไม่สามารถโหลดข้อมูลการจองได้", "error");
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  const fetchServices = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price")
        .order("name");

      if (error) {
        console.error("Error fetching services:", error);
      } else {
        setServices(data || []);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  }, []);

  const fetchPromotions = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching promotions:", error);
      } else {
        setPromotions(data || []);
      }
    } catch (err) {
      console.error("Error fetching promotions:", err);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchPromotions();
  }, [selectedDate, realtimeStatus, fetchBookings, fetchServices, fetchPromotions]);

  // เมื่อโหลดข้อมูลเรียบร้อย หรือเปลี่ยนวัน ให้พยายามเลือกเวลาปัจจุบัน (หรือเวลาแรก) เป็นค่าเริ่มต้น
  useEffect(() => {
    if (!loading && !selectedSlot) {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentTime = `${currentH.toString().padStart(2, "0")}:${currentM < 30 ? "00" : "30"}`;

      // ถ้าเวลาปัจจุบันอยู่ในช่วง 09:00 - 20:00 ให้เลือกเวลาปัจจุบัน
      if (timeSlots.includes(currentTime)) {
        setSelectedSlot(currentTime);
      } else {
        setSelectedSlot("09:00");
      }
    }
  }, [loading, selectedDate, timeSlots, selectedSlot]);

  useEffect(() => {
    // Listen to all changes in the bookings table regardless of the selected date
    // to ensure we catch updates that might affect our view.
    const channel = supabase
      .channel('bookings-all-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('🔄 Realtime update detected:', payload.eventType);
          // Fetch with wider date range to catch rescheduled bookings
          fetchBookings(true, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_busy_times' },
        () => fetchBookings(true)
      )
      .subscribe((status) => {
        console.log('📡 Realtime Status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('error');
          // No need for explicit reconnect as Supabase client handles it, 
          // but we update the UI status.
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  // --- Socket.io Realtime Setup ---
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("📡 Socket.io connected");
      setRealtimeStatus("connected");
    });

    socket.on("bookingUpdate", () => {
      console.log("🔄 Socket.io: Booking update received");
      fetchBookings(true, true);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket.io connection error:", err);
      // Only set error if Supabase realtime is also failed
      // For now let's just log it
    });

    socket.on("disconnect", () => {
      console.log("📡 Socket.io disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchBookings]);

  // Separate effect to handle Walk-in modal date changes
  useEffect(() => {
    if (showWalkInModal && walkInForm.date !== selectedDate) {
      // If the admin changes the date inside the walk-in modal, 
      // we sync the main view to that date to reuse the data fetching logic
      setSelectedDate(walkInForm.date);
    }
  }, [walkInForm.date, showWalkInModal]);

  // 2. ฟังก์ชันอัปเดตสถานะ
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from("bookings")
          .update({ status: newStatus })
          .eq("id", id);
        if (error) throw error;
      }

      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === id ? { ...booking, status: newStatus } : booking,
        ),
      );

      // Notify others via WebSocket
      if (socketRef.current) {
        socketRef.current.emit("bookingUpdate");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      showNotification("ไม่สามารถอัปเดตสถานะได้", "error");
    }
  };

  // Helper function: บวกเวลาเพิ่ม (นาที)
  const addMinutesToTime = (timeStr, minutesToAdd) => {
    const [hours, mins] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(mins + minutesToAdd);

    const newHours = String(date.getHours()).padStart(2, "0");
    const newMins = String(date.getMinutes()).padStart(2, "0");
    return `${newHours}:${newMins}`;
  };

  // 3. ฟังก์ชันบันทึก Walk-in
  const handleWalkInSubmit = async (e) => {
    e.preventDefault();

    // เช็คแค่ เวลา, บริการ และ เบอร์โทร (ต้องครบ 10 หลัก)
    if (!walkInForm.time || !walkInForm.phone || !walkInForm.service) {
      showNotification("กรุณากรอกข้อมูลให้ครบถ้วน (เวลา, บริการ และ เบอร์โทร)", "warning");
      return;
    }

    if (walkInForm.phone.length !== 10) {
      showNotification("กรุณาระบุเบอร์โทรศัพท์ให้ครบ 10 หลัก", "warning");
      return;
    }

    const newBooking = {
      user_id: user?.id, // กลับมาใช้ user.id เพื่อให้ผ่าน Constraint NOT NULL ของ Database
      // บันทึกเบอร์โทรไว้ในฟิลด์ customer_name สำหรับ Walk-in
      customer_name: walkInForm.phone,
      service_name: walkInForm.service || "Walk-in",
      booking_date: walkInForm.date,
      booking_time: walkInForm.time,
      price: Number(walkInForm.price) || 0,
      status: "Pending",
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("bookings")
          .insert([newBooking])
          .select("*")
          .single();

        if (error) {
          // Log Error ออกมาดูชัดๆ ถ้ายังไม่ได้อีก
          console.error("Supabase Error:", error.message, error.details);
          throw error;
        }

        // อัปเดต UI
        setBookings((prev) => [
          {
            id: data.id,
            customer: data.customer_name,
            service: data.service_name,
            date: data.booking_date,
            time: data.booking_time,
            price: data.price,
            status: data.status,
            user_id: data.user_id,
            applied_promo: data.applied_promo,
          },
          ...prev,
        ]);

        // Notify others via WebSocket
        if (socketRef.current) {
          socketRef.current.emit("bookingUpdate");
        }
      }
    } catch (err) {
      console.error("Error inserting walk-in booking:", err);
      showNotification("ไม่สามารถบันทึกคิว Walk-in ได้: " + (err.message || ""), "error");
      return;
    }

    setShowWalkInModal(false);
    setWalkInForm({
      date: new Date().toLocaleDateString('en-CA'),
      time: "",
      phone: "",
      service: "",
      price: 0,
    });
    showNotification("เพิ่มคิว Walk-in เรียบร้อยแล้ว", "success");
  };

  // --- แจ้งเตือนคิวถัดไป (ระบบเลือกคนแรกที่รออยู่) ---
  const handleNotifyNextQueue = async () => {
    setNotifyingNextQueue(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/next-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to notify next queue");

      showNotification(result.message, "success");
    } catch (error) {
      console.error("Error notifying next queue:", error);
      showNotification(error.message, "error");
    } finally {
      setNotifyingNextQueue(false);
    }
  };

  // --- แจ้งเตือนลูกค้ารายบุคคล (แอดมินเลือก) ---
  const handleNotifyBooking = async (bookingId) => {
    if (!bookingId) return;
    try {
      const response = await fetch(`${SERVER_URL}/api/notify-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: String(bookingId) }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to notify customer");

      showNotification(result.message, "success");
    } catch (error) {
      console.error("Error notifying customer:", error);
      showNotification(error.message, "error");
    }
  };

  const handleBusySubmit = async (e) => {
    e.preventDefault();
    const confirmDate = busyForm.date;
    const confirmEndDate = busyForm.endDate;

    let confirmMsg = "";
    if (busyForm.mode === "full") {
      confirmMsg = `ต้องการยกเลิกคิวทั้งหมดในวันที่ ${confirmDate} ใช่หรือไม่?`;
    } else if (busyForm.mode === "multi") {
      confirmMsg = `ต้องการยกเลิกคิวทั้งหมดตั้งแต่วันที่ ${confirmDate} ถึง ${confirmEndDate} ใช่หรือไม่?`;
    } else {
      confirmMsg = `ต้องการยกเลิกคิวในช่วงเวลา ${busyForm.startTime} - ${busyForm.endTime} ของวันที่ ${confirmDate} ใช่หรือไม่?`;
    }

    setConfirmConfig({
      title: "ยืนยันการดำเนินการ",
      message: confirmMsg,
      onConfirm: () => executeBusySubmit(confirmDate, confirmEndDate),
      type: "danger",
    });
    setShowConfirmModal(true);
  };

  const executeBusySubmit = async (confirmDate, confirmEndDate) => {
    setShowConfirmModal(false);
    setIsProcessingBusy(true);
    try {
      let endpoint = "";
      let body = {};

      if (busyForm.mode === "full") {
        endpoint = `${SERVER_URL}/api/cancel-full-day-bookings`;
        body = { date: confirmDate };
      } else if (busyForm.mode === "multi") {
        endpoint = `${SERVER_URL}/api/cancel-multi-day-bookings`;
        body = { startDate: confirmDate, endDate: confirmEndDate };
      } else {
        endpoint = `${SERVER_URL}/api/cancel-time-range-bookings`;
        body = {
          date: confirmDate,
          startTime: busyForm.startTime,
          endTime: busyForm.endTime,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST", // Corrected: Using POST as per backend
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server error (${response.status}): ${errorText.slice(0, 100)}...`,
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON กรุณารีสตาร์ทเซิร์ฟเวอร์หลังบ้านครับ",
        );
      }

      const result = await response.json();
      showNotification(result.message, "success");
      setShowBusyModal(false);
      fetchBookings(); // รีเฟรชข้อมูล
    } catch (error) {
      console.error("Busy submit error:", error);
      showNotification(error.message, "error");
    } finally {
      setIsProcessingBusy(false);
    }
  };

  // ฟังก์ชันกรองข้อมูล (ไม่มีการค้นหาอีกต่อไป - แสดงทั้งหมด)
  const filteredBookings = bookings;

  // ฟังก์ชันเลื่อนวัน
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    // ไม่อนุญาตให้ไปวันที่ผ่านมาแล้ว
    const today = new Date().toLocaleDateString('en-CA');
    const previousDateStr = previousDate.toLocaleDateString('en-CA');
    if (previousDateStr < today) {
      showNotification("ไม่สามารถดูวันที่ผ่านมาแล้วได้ครับ", "warning");
      return;
    }

    setSelectedDate(previousDateStr);
  };

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(currentDate.toLocaleDateString('en-CA'));
  };

  // ฟอร์แมตวันที่เป็นภาษาไทย (พ.ศ. format)
  const formatThaiDate = (dateString) => {
    const date = new Date(dateString);
    const thaiYear = date.getFullYear() + 543;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}/${thaiYear}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      Completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      Pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
      Confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.Pending}`}
      >
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
            onClick={() => navigate("/admin/dashboard")}
            className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="กลับไปหน้า Dashboard"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col">
            <h1 className="text-3xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
              จัดการการจอง
              <div
                className={`w-2.5 h-2.5 rounded-full ${realtimeStatus === "connected"
                  ? "bg-green-500 shadow-[0_0_10px_#22c55e]"
                  : realtimeStatus === "error"
                    ? "bg-red-500 shadow-[0_0_10px_#ef4444]"
                    : "bg-yellow-500 animate-pulse"
                  }`}
                title={
                  realtimeStatus === "connected"
                    ? "เชื่อมต่อ Real-time แล้ว"
                    : realtimeStatus === "error"
                      ? "การเชื่อมต่อขัดข้อง"
                      : "กำลังเชื่อมต่อ..."
                }
              />
              <button
                onClick={() => {
                  setRefreshing(true);
                  fetchBookings(true);
                }}
                className={`ml-1 p-2 rounded-full hover:bg-white/10 transition-all ${refreshing ? 'animate-spin text-amber-500' : 'text-zinc-500'}`}
                title="รีเฟรชข้อมูล"
              >
                <Clock size={20} />
              </button>
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-zinc-400 text-sm">
                ตรวจสอบและจัดการคิวลูกค้าทั้งหมด
              </p>
              <div className="h-1 w-1 bg-zinc-700 rounded-full" />
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Last Sync: {lastUpdated.toLocaleTimeString('th-TH')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setWalkInForm(prev => ({
                ...prev,
                date: selectedDate,
                time: selectedSlot || "09:00"
              }));
              setShowWalkInModal(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={18} /> จองคิวใหม่ (Walk-in)
          </button>
        </div>
      </div>

      {/* Date Navigation & Date Picker */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 flex items-center justify-center gap-4 shadow-lg">
        {/* Date Navigation with Arrows + Date Picker */}
        {selectedDate > new Date().toLocaleDateString('en-CA') && (
          <button
            onClick={handlePreviousDay}
            className="p-3 bg-zinc-800 border border-white/10 rounded-xl hover:bg-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition-all active:scale-95"
            title="วันก่อนหน้า"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5 pointer-events-none" />
          <input
            type="date"
            value={selectedDate}
            min={new Date().toLocaleDateString('en-CA')}
            onChange={(e) => {
              const selectedDate = e.target.value;
              const today = new Date().toLocaleDateString('en-CA');
              if (selectedDate < today) {
                showNotification("ไม่สามารถดูวันที่ผ่านมาแล้วได้ครับ", "warning");
                e.target.value = today;
                setSelectedDate(today);
                return;
              }
              setSelectedDate(selectedDate);
            }}
            className="w-64 bg-zinc-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-lg text-white focus:border-amber-500/50 outline-none transition-all font-num"
          />
        </div>

        <button
          onClick={handleNextDay}
          className="p-3 bg-zinc-800 border border-white/10 rounded-xl hover:bg-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition-all active:scale-95"
          title="วันถัดไป"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* NEW Two-Pane Layout */}
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* --- Left Pane: Time Grid Sidebar --- */}
        <div className="w-full xl:flex-9 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-2xl shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg">
              <Clock className="text-amber-500" size={18} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              ตารางเวลา{" "}
              <span className="text-white text-[10px] font-bold ml-1 uppercase">
                (Today's Slots)
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => {
              const bookingAtSlot = getPrioritizedBooking(time);
              const isSelected = selectedSlot === time;
              const isBooked = !!bookingAtSlot;
              const status = bookingAtSlot?.status;

              // Check if slot is busy from admin_busy_times
              const isBusy = adminBusySlots.some((busy) => {
                if (busy.is_full_day) return true;
                const normalize = (t) => t.split(":").slice(0, 2).join(":");
                const currentT = normalize(time);
                return (
                  currentT >= normalize(busy.start_time) &&
                  currentT <= normalize(busy.end_time)
                );
              });

              // 1. กำหนดสีตามสถานะ (ฟังก์ชันช่วยเลือกสี)
              let statusStyles = "";

              if (isSelected) {
                statusStyles =
                  "bg-amber-500 border-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)] z-10";
              } else if (isBusy) {
                statusStyles = "bg-red-500/10 border-red-500/20 text-red-500";
              } else if (isBooked) {
                switch (status) {
                  case "Completed":
                    statusStyles =
                      "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:border-emerald-500/50";
                    break;
                  case "Cancelled":
                    statusStyles =
                      "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/20";
                    break;
                  default:
                    statusStyles =
                      "bg-amber-400/10 border-amber-400/20 text-amber-400 hover:border-amber-400/40";
                    break;
                }
              } else {
                statusStyles =
                  "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/20";
              }

              return (
                <button
                  key={time}
                  onClick={() => setSelectedSlot(time)}
                  className={`relative h-18 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border-2 ${statusStyles}`}
                >
                  <span className="text-3xl font-black font-num">{time}</span>

                  {isBusy && !isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  )}

                  {isBooked && !isSelected && status !== "Cancelled" && (
                    <div
                      className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full shadow-lg ${status === "Completed"
                        ? "bg-emerald-500 shadow-emerald-500/50"
                        : "bg-amber-400 shadow-amber-500/50"
                        }`}
                    />
                  )}

                  {/* ขีดเส้นใต้เมื่อเลือก */}
                  {isSelected && (
                    <div className="absolute -bottom-1 w-8 h-1 bg-black rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 px-2">
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="w-5 h-5 rounded-md bg-zinc-800 border border-white/10" />
              <span className="text-zinc-400">ว่าง / Available</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="w-5 h-5 rounded-md bg-zinc-800 border border-white/10 relative flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-300 shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
              </div>
              <span className="text-zinc-400">มีคนจอง / Booked</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="w-5 h-5 rounded-md bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              <span className="text-zinc-400">เสร็จสิ้น / Completed</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold mt-1">
              <div className="w-5 h-5 rounded-md bg-red-500/20 border border-red-500/40 shadow-[0_0_5px_rgba(239,68,68,0.2)]" />
              <span className="text-red-400/80">สีแดงคือ ประกาศว่าร้านไม่ว่างและจะแจ้งเตือนไปยัง LINE ลูกค้า</span>
            </div>
          </div>
        </div>

        {/* --- Right Pane: Detail View Card --- */}
        <div className="xl:flex-1 w-full min-h-125">
          {loading ? (
            <div className="h-full min-h-125 flex flex-col items-center justify-center bg-zinc-900/30 rounded-[3rem] border border-white/5">
              <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 font-bold">กำลังอัปเดตข้อมูล...</p>
            </div>
          ) : (
            <div key={selectedSlot} className="animate-[fadeIn_0.4s_ease-out]">
              {selectedSlot ? (
                (() => {
                  const booking = getPrioritizedBooking(selectedSlot);

                  if (booking) {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-CA');
                    const isToday = booking.date === todayStr;
                    const isPastDate = booking.date < todayStr;
                    const [bHour, bMin] = booking.time.split(":").map(Number);
                    const hasTimeReached = now.getHours() > bHour || (now.getHours() === bHour && now.getMinutes() >= bMin);
                    const canMarkCompleted = isPastDate || (isToday && hasTimeReached);

                    // แจ้งเตือนได้ก่อนถึงเวลา 15 นาที
                    const slotTime = new Date();
                    slotTime.setHours(bHour, bMin, 0, 0);
                    const minutesUntilSlot = (slotTime - now) / (1000 * 60);
                    const canNotify = isPastDate || (isToday && minutesUntilSlot <= 15);

                    return (
                      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full -mr-16 -mt-16" />

                        <div className="relative flex flex-col gap-4">
                          {/* Header Detail */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl font-black text-white border border-white/10 shadow-inner">
                                #{booking.id}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  {getStatusBadge(booking.status)}
                                  <span className="text-white text-[9px] font-black uppercase tracking-widest">
                                    Selected Client
                                  </span>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight">
                                  {booking.customer}
                                </h3>
                              </div>
                            </div>

                            <div className="flex flex-col items-end bg-black/40 px-5 py-2.5 rounded-xl border border-white/5">
                              <span className="text-white text-[9px] font-black uppercase mb-0.5">
                                Total Amount
                              </span>
                              <span className="text-2xl font-black text-amber-500 font-num">
                                ฿{booking.price}
                              </span>
                            </div>
                          </div>

                          {/* Body Detail */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Time Card */}
                            <div className="bg-zinc-950/50 rounded-xl p-5 border border-white/5 shadow-xl">
                              <div className="flex items-center gap-2 text-white font-black mb-2 px-1">
                                <Calendar size={16} />
                                <span className="text-[9px] uppercase tracking-widest">
                                  Appointed Time
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-amber-500">
                                <Clock
                                  size={28}
                                  strokeWidth={2.5}
                                  className="drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                                />
                                <span className="text-xl font-black font-num tracking-tighter">
                                  {booking.time}{" "}
                                  <span className="text-base font-bold ml-0.5">
                                    น.
                                  </span>
                                </span>
                              </div>
                              <p className="mt-2 text-zinc-400 text-sm font-bold px-1">
                                {booking.date ? booking.date.split('-').reverse().join('-') : booking.date}
                              </p>
                            </div>

                            {/* Service Card */}
                            <div className="bg-zinc-950/50 rounded-xl p-5 border border-white/5 shadow-xl flex flex-col justify-center">
                              <div className="flex items-center gap-2 text-white font-black mb-2 px-1">
                                <Sparkles size={16} />
                                <span className="text-[9px] uppercase tracking-widest">
                                  Service Item
                                </span>
                              </div>
                              <h4 className="text-xl font-black text-white px-1 truncate">
                                {booking.service}
                              </h4>
                              {booking.applied_promo && (
                                <div className="mt-2 ml-1 w-fit bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                  {booking.applied_promo}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5 gap-2 mt-1">
                            <button
                              onClick={() => handleEdit(booking.id)}
                              disabled={booking.status === "Cancelled" || booking.status === "Completed"}
                              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${booking.status !== "Cancelled" && booking.status !== "Completed"
                                ? "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black shadow-xl hover:shadow-amber-500/20"
                                : "bg-zinc-800/50 border-zinc-700/30 text-zinc-600 opacity-40 cursor-not-allowed"
                                }`}
                            >
                              <Scissors size={24} />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                แก้ไข
                              </span>
                            </button>

                            <button
                              onClick={() => handleNotifyBooking(booking.id)}
                              disabled={booking.status !== "Pending" || !canNotify}
                              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${booking.status === "Pending" && canNotify
                                ? "bg-sky-500/5 border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white shadow-xl hover:shadow-sky-500/20"
                                : "bg-zinc-800/50 border-zinc-700/30 text-zinc-600 opacity-40 cursor-not-allowed"
                                }`}
                            >
                              <MessageSquareText size={24} />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                แจ้งเตือน
                              </span>
                            </button>

                            <button
                              onClick={() => handleReschedule(booking.id)}
                              disabled={
                                booking.status === "Cancelled" ||
                                booking.status === "Completed"
                              }
                              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${booking.status === "Pending" ||
                                booking.status === "Confirmed"
                                ? "bg-blue-500/5 border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white shadow-xl hover:shadow-blue-500/20"
                                : "bg-zinc-800/50 border-zinc-700/30 text-zinc-600 opacity-40 cursor-not-allowed"
                                }`}
                            >
                              <CalendarClock size={24} />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                เลื่อนคิว
                              </span>
                            </button>

                            <button
                              onClick={async () => {
                                // 1. อัปเดต Supabase ทันที (UI ตอบสนองเร็ว)
                                await handleUpdateStatus(booking.id, "Cancelled");
                                showNotification("ยกเลิกคิวเรียบร้อยแล้ว", "success");

                                // 2. ส่ง LINE notification แบบ fire-and-forget
                                fetch(`${SERVER_URL}/api/admin-cancel-no-show`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ bookingId: booking.id }),
                                }).catch(err => console.warn("LINE notify failed:", err));
                              }}
                              disabled={booking.status !== "Pending"}
                              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${booking.status === "Pending"
                                ? "bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white shadow-xl hover:shadow-red-500/20"
                                : "bg-zinc-800/50 border-zinc-700/30 text-zinc-600 opacity-40 cursor-not-allowed"
                                }`}
                            >
                              <XCircle size={24} />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                ยกเลิก
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                handleUpdateStatus(booking.id, "Completed")
                              }
                              disabled={booking.status !== "Pending" || !canMarkCompleted}
                              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 border-2 ${booking.status === "Pending" && canMarkCompleted
                                ? "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                : "bg-zinc-800/50 border-zinc-700/30 text-zinc-600 opacity-40 cursor-not-allowed"
                                }`}
                            >
                              <Check size={32} strokeWidth={4} />
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                เสร็จสิ้น
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (isSlotBusy(selectedSlot)) {
                    return (
                      <div className="bg-red-950/20 border-2 border-dashed border-red-500/30 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center transition-all duration-500 h-full">
                        <div className="w-24 h-24 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mb-6">
                          <XCircle size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-3xl font-black text-red-400 mb-3 uppercase tracking-tight">
                          ปิดร้าน
                        </h3>
                        <p className="text-red-500/60 text-sm font-bold uppercase tracking-widest">
                          ช่วงเวลานี้ถูกประกาศปิด / ไม่ว่าง
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-zinc-900/30 border-2 border-dashed border-white/5 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center group hover:bg-zinc-900/50 transition-all duration-500 h-full">
                        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <Clock size={40} className="text-zinc-600" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-8 uppercase tracking-tight">
                          เวลานี้ยังว่างอยู่
                        </h3>
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="bg-zinc-900/10 border border-white/5 rounded-[3rem] p-20 text-center h-full flex flex-col items-center justify-center">
                  <AlertCircle size={48} className="text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-bold text-xl uppercase tracking-widest">
                    โปรดเลือกช่วงเวลาจากด้านซ้าย
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Reschedule Modal (Admin) --- */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                <CalendarClock className="text-blue-400" size={24} />{" "}
                เลื่อนคิวลูกค้า
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-black shrink-0">
                  <Scissors size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">
                    คิวปัจจุบัน
                  </p>
                  <h4 className="text-white font-bold truncate">
                    {rescheduleData.serviceName}
                  </h4>
                  <p className="text-zinc-400 text-xs font-num">
                    {rescheduleData.currentDate} • {rescheduleData.currentTime}{" "}
                    น.
                  </p>
                </div>
              </div>

              {/* Date Display (Read-only as per request: same-day only) */}
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
                  <Calendar size={16} /> วันที่ดำเนินการ (เลื่อนได้เฉพาะวันเดิม)
                </label>
                <div className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl px-5 py-4 text-zinc-400 font-num">
                  {rescheduleData.date}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  * ขณะนี้ระบบอนุญาตให้เลื่อนคิวได้เฉพาะภายในวันเดียวกันเท่านั้น
                </p>
              </div>

              {/* Time Selection */}
              {rescheduleData.date && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                  <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                    <Clock size={16} /> เลือกเวลาใหม่
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-62.5 overflow-y-auto pr-2 scrollbar-hide">
                    {timeSlots.map((slot) => {
                      const isBooked = rescheduleBookedSlots.some(
                        (bTime) => bTime && bTime.startsWith(slot),
                      );
                      const isBusy = rescheduleAdminBusySlots.some((busy) => {
                        if (busy.is_full_day) return true;
                        return (
                          slot >= busy.start_time.slice(0, 5) &&
                          slot <= busy.end_time.slice(0, 5)
                        );
                      });
                      const now = new Date();
                      const todayStr = now.toLocaleDateString("en-CA");
                      const [curH, curM] = [now.getHours(), now.getMinutes()];
                      const slotWithGrace = addMinutesToTime(slot, 10);
                      const isPast =
                        rescheduleData.date === todayStr &&
                        slotWithGrace < `${curH.toString().padStart(2, "0")}:${curM.toString().padStart(2, "0")}`;

                      const isDisabled = isBooked || isBusy || isPast;

                      return (
                        <button
                          key={slot}
                          disabled={isDisabled}
                          onClick={() =>
                            setRescheduleData({ ...rescheduleData, time: slot })
                          }
                          className={`py-2.5 rounded-xl text-sm font-num font-bold transition-all border ${rescheduleData.time === slot
                            ? "bg-blue-500 text-black border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.35)] scale-105 z-10"
                            : isBusy
                              ? "bg-red-500/10 text-red-500 border-red-500/20 cursor-not-allowed opacity-40"
                              : isBooked
                                ? "bg-amber-500/10 text-amber-500/50 border-amber-500/20 cursor-not-allowed opacity-40"
                                : isPast
                                  ? "bg-zinc-900 text-zinc-600 border-white/5 cursor-not-allowed opacity-30"
                                  : "bg-zinc-800 text-zinc-300 border-white/5 hover:border-blue-500/50 hover:text-white"
                            }`}
                        >
                          {isBusy ? "ไม่ว่าง" : slot}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-3">
                    *
                    ระบบจะปิดช่วงเวลาที่มีการจองหรือแอดมินประกาศไม่ว่างแล้วอัตโนมัติ
                  </p>
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
                  className="flex-1 py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
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
      {/* --- Edit Booking Modal (Admin) --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                <Scissors className="text-amber-500" size={24} />{" "}
                แก้ไขข้อมูลการจอง
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Service Selection */}
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                  <Scissors size={16} className="inline mr-2" /> เลือกทรงผม/บริการใหม่
                </label>
                <select
                  required
                  value={editBookingData.service_name}
                  onChange={(e) => {
                    const newService = e.target.value;
                    const newPrice = calculateEditPrice(newService, editBookingData.applied_promo);
                    setEditBookingData({
                      ...editBookingData,
                      service_name: newService,
                      price: newPrice
                    });
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-amber-500 outline-none appearance-none cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} (฿{s.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Promotion Selection */}
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-3 block items-center gap-2">
                  <Sparkles size={16} className="inline mr-2" /> เลือกโปรโมชั่น
                </label>
                <select
                  value={editBookingData.applied_promo}
                  onChange={(e) => {
                    const newPromo = e.target.value;
                    const newPrice = calculateEditPrice(editBookingData.service_name, newPromo);
                    setEditBookingData({
                      ...editBookingData,
                      applied_promo: newPromo,
                      price: newPrice
                    });
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-amber-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">-- ไม่ใช้โปรโมชั่น --</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} ({p.discount_text})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Display */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-zinc-400 font-bold">ราคาสุทธิ</span>
                <span className="text-2xl font-black text-amber-500 font-num">฿{editBookingData.price}</span>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isEditLoading}
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isEditLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <>บันทึกการแก้ไข</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Walk-in Modal --- */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          {/* ปรับ max-w-md เป็น max-w-2xl และเพิ่ม padding เป็น p-8 */}
          <div className="bg-zinc-900 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl p-8 animate-[slideUp_0.3s_ease-out]">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Plus size={24} className="text-amber-500" />
                </div>
                เพิ่มคิว Walk-in
              </h3>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-6">
              {/* Row 1: Date & Price (จัดให้อยู่แถวเดียวกันเพื่อความสวยงามในจอใหญ่) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xl text-zinc-400 mb-2 block">
                    วันที่
                  </label>
                  <input
                    type="date"
                    required
                    value={walkInForm.date}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toLocaleDateString('en-CA');
                      if (selectedDate < today) {
                        showNotification("ไม่สามารถเพิ่ม Walk-in วันที่ผ่านมาแล้วได้ครับ", "warning");
                        e.target.value = today;
                        setWalkInForm({ ...walkInForm, date: today });
                        return;
                      }
                      setWalkInForm({ ...walkInForm, date: selectedDate });
                    }}
                    min={new Date().toLocaleDateString('en-CA')}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-5 py-3 text-lg text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xl text-zinc-400 mb-2 block">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength="10"
                    minLength="10"
                    pattern="[0-9]{10}"
                    placeholder="08X-XXX-XXXX"
                    value={walkInForm.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) {
                        setWalkInForm({ ...walkInForm, phone: val });
                      }
                    }}
                    className="w-full bg-linear-to-b from-zinc-950 to-zinc-900 border border-white/10 rounded-xl px-5 py-3 text-lg text-white focus:border-amber-500 outline-none font-num transition-all"
                  />
                </div>
              </div>

              {/* Row: Service */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-xl text-zinc-400 mb-2 block">
                    เลือกบริการ
                  </label>
                  <select
                    required
                    value={walkInForm.service}
                    onChange={(e) => {
                      const selected = services.find(s => s.name === e.target.value);
                      setWalkInForm({
                        ...walkInForm,
                        service: e.target.value,
                        price: selected ? selected.price : 0
                      });
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-5 py-3 text-lg text-white focus:border-amber-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">-- เลือกบริการ --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (฿{s.price})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Time Slots */}
              <div>
                <label className="text-xl text-zinc-400 mb-3 block">
                  เลือกเวลา
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {timeSlots.map((slot) => {
                    const bookingAtSlot = getPrioritizedBooking(slot);
                    const isBooked = !!bookingAtSlot;
                    const status = bookingAtSlot?.status;

                    const isBusy = adminBusySlots.some((busy) => {
                      if (busy.is_full_day) return true;
                      const normalize = (t) => t.split(":").slice(0, 2).join(":");
                      const currentT = normalize(slot);
                      return (
                        currentT >= normalize(busy.start_time) &&
                        currentT <= normalize(busy.end_time)
                      );
                    });

                    // Check if slot is in the past (for today) - Allow 10 minutes grace period
                    const now = new Date();
                    const todayDate = now.toLocaleDateString('en-CA');
                    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                    const slotWithGrace = addMinutesToTime(slot, 10);
                    const isPast = walkInForm.date === todayDate && slotWithGrace < currentTimeStr;

                    // กำหนดสีและสถานะ
                    let statusStyles = "";
                    let displaySlot = slot;
                    let isDisabled = false;

                    if (walkInForm.time === slot) {
                      statusStyles = "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20 scale-105";
                    } else if (isBooked && status !== "Cancelled") {
                      // Only show as booked if it's NOT cancelled
                      switch (status) {
                        case "Completed":
                          statusStyles = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                          isDisabled = true;
                          break;
                        default: // Pending, Confirmed, etc.
                          statusStyles = "bg-amber-500/20 text-amber-500 border-amber-500/30";
                          isDisabled = true;
                          break;
                      }
                    } else if (isBusy) {
                      statusStyles = "bg-red-500/10 text-red-500 border-red-500/20";
                      displaySlot = "ไม่ว่าง";
                      isDisabled = true;
                    } else if (isPast) {
                      statusStyles = "bg-zinc-900/50 text-zinc-700 border-zinc-800/50 cursor-not-allowed";
                      isDisabled = true;
                    } else if (isBooked && status === "Cancelled") {
                      // If it's only a cancelled booking and not busy, it's actually available
                      statusStyles = "bg-zinc-950 text-zinc-400 border-white/5 hover:border-amber-500/50 hover:text-zinc-200";
                    } else {
                      statusStyles = "bg-zinc-950 text-zinc-400 border-white/5 hover:border-amber-500/50 hover:text-zinc-200";
                    }

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isDisabled}
                        onClick={() =>
                          setWalkInForm({ ...walkInForm, time: slot })
                        }
                        className={`relative py-3 px-2 rounded-xl text-2xl font-num font-bold border transition-all ${statusStyles} ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {displaySlot}

                        {/* Status Dot for Walk-in Modal Grid */}
                        {!isDisabled && isBooked && status !== "Cancelled" && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                        {isDisabled && isBooked && status === "Completed" && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-lg transition-colors shadow-lg shadow-amber-500/20"
                >
                  ยืนยันการจอง
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }



      {/* --- Custom Confirmation Modal (Card Style) --- */}
      {
        showConfirmModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              <div
                className={`h-2 w-full ${confirmConfig.type === "danger" ? "bg-red-500" : "bg-amber-500"}`}
              ></div>
              <div className="p-8 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmConfig.type === "danger"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-amber-500/10 text-amber-500"
                    }`}
                >
                  {confirmConfig.type === "danger" ? (
                    <AlertCircle size={32} />
                  ) : (
                    <CheckCircle size={32} />
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {confirmConfig.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                  {confirmConfig.message}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmConfig.onConfirm}
                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg ${confirmConfig.type === "danger"
                      ? "bg-red-600 hover:bg-red-500 shadow-red-600/20"
                      : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
                      }`}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- NOTIFICATION MODAL --- */}
      {
        notification.show && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
              onClick={() => setNotification({ ...notification, show: false })}
            ></div>
            <div className="bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 p-8 text-center relative z-10 animate-[slideUp_0.3s_ease-out]">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${notification.type === "error"
                  ? "bg-red-500/20 text-red-500"
                  : notification.type === "warning"
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-green-500/20 text-green-500"
                  }`}
              >
                {notification.type === "error" ? (
                  <XCircle className="w-8 h-8" />
                ) : notification.type === "warning" ? (
                  <AlertCircle className="w-8 h-8" />
                ) : (
                  <CheckCircle className="w-8 h-8" />
                )}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">
                {notification.type === "error"
                  ? "เกิดข้อผิดพลาด"
                  : notification.type === "warning"
                    ? "แจ้งเตือน"
                    : "สำเร็จ"}
              </h4>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 whitespace-pre-wrap">
                {notification.message}
              </p>
              <button
                onClick={() => setNotification({ ...notification, show: false })}
                className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${notification.type === "error"
                  ? "bg-red-500 text-white hover:bg-red-400 shadow-red-500/20"
                  : "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20"
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
