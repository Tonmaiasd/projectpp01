import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, DollarSign, CalendarCheck, TrendingUp,
  MoreHorizontal, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { supabase } from '../../supabase/client';
import Pagination from '../../components/Pagination';

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [period, setPeriod] = useState('daily'); // 'daily' | 'monthly' | 'yearly'
  const [dashboardPage, setDashboardPage] = useState(1); //Pagination

  // สถานะสำหรับเลือกช่วงเวลาเจาะจง
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Completed' | 'Cancelled'

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // ดึงข้อมูลการจองทั้งหมด
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      const mapped = bookingsData.map(b => ({
        id: b.id,
        customer: b.customer_name || (b.user_id ? String(b.user_id).slice(0, 8) + '…' : '-'),
        service: b.service_name,
        time: `${b.booking_date ? b.booking_date.split('-').reverse().join('-') : ''} ${b.booking_time ? b.booking_time.slice(0, 5) : ''}`.trim(),
        status: b.status || 'Pending',
        price: b.price || 0,
        date: b.booking_date,
      }));

      setBookings(mapped);

      // ดึงจำนวนลูกค้าทั้งหมดจากตาราง profiles
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      setTotalUsers(usersCount ?? 0);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Realtime change received in Dashboard:', payload);
          fetchData(true); // Silent update
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
  }, []);

  // คำนวณสถิติและรายการจองที่กรองแล้ว
  const { stats, filteredBookings, subLabel } = useMemo(() => {
    let filtered = [];
    let periodLabel = "";
    let subLabel = "";

    if (period === 'daily') {
      filtered = bookings.filter(b => b.date === selectedDate);
      periodLabel = selectedDate === new Date().toLocaleDateString('en-CA') ? "วันนี้" : selectedDate.split('-').reverse().join('-');
      subLabel = `วันที่ ${selectedDate.split('-').reverse().join('-')}`;
    } else if (period === 'monthly') {
      filtered = bookings.filter(b => b.date && b.date.startsWith(selectedMonth));
      periodLabel = selectedMonth === new Date().toLocaleDateString('en-CA').slice(0, 7) ? "เดือนนี้" : selectedMonth.split('-').reverse().join('-');
      subLabel = `เดือน ${selectedMonth.split('-').reverse().join('-')}`;
    } else {
      filtered = bookings.filter(b => b.date && b.date.startsWith(selectedYear));
      periodLabel = selectedYear === new Date().getFullYear().toString() ? "ปีนี้" : selectedYear;
      subLabel = `ปี ${selectedYear}`;
    }

    const revenue = filtered
      .filter(b => b.status === 'Completed' || b.status === 'Confirmed')
      .reduce((sum, b) => sum + Number(b.price || 0), 0);

    const total = filtered.length;
    const pending = filtered.filter(b => b.status === 'Pending').length;
    const completed = filtered.filter(b => b.status === 'Completed').length;

    // Apply Status Filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    const statsData = [
      {
        title: `รายได้${periodLabel} (${period === 'daily' ? 'ยืนยัน/เสร็จสิ้น' : 'รวมทั้งหมด'})`,
        value: `฿${revenue.toLocaleString()}`,
        icon: DollarSign,
        color: "text-green-500",
        bg: "bg-green-500/10",
        trend: `เสร็จสิ้นแล้ว ${completed} รายการ`
      },
      {
        title: `การจอง${periodLabel}ทั้งหมด`,
        value: `${total}`,
        icon: CalendarCheck,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        trend: `รอดำเนินการ ${pending} รายการ`
      },
      {
        title: "ลูกค้าทั้งหมด (ในระบบ)",
        value: totalUsers.toLocaleString(),
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        trend: "ยอดสะสมทั้งหมด"
      },
    ];

    return { stats: statsData, filteredBookings: filtered, subLabel };
  }, [bookings, totalUsers, period, selectedDate, selectedMonth, selectedYear, statusFilter]);

  // Pagination for dashboard bookings
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ITEMS_PER_PAGE));
  const paginatedBookings = useMemo(() => {
    const start = (dashboardPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, dashboardPage]);

  // Reset page when period changes
  useEffect(() => {
    setDashboardPage(1);
  }, [period, selectedDate, selectedMonth, selectedYear, statusFilter]);

  const getStatusBadge = (status) => {
    const styles = {
      Completed: "bg-green-500/10 text-green-500 border-green-500/20",
      Pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      Confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.Pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">

      {/* Header & Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-white mb-2 flex items-center gap-3">
              Dashboard
              <div
                className={`w-2.5 h-2.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                  realtimeStatus === 'error' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                    'bg-yellow-500 animate-pulse'
                  }`}
                title={realtimeStatus === 'connected' ? 'เชื่อมต่อ Real-time แล้ว' : 'กำลังเชื่อมต่อ...'}
              />
            </h1>
          </div>
          <p className="text-zinc-400">สรุปผลข้อมูล {subLabel} • {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* ส่วนเลือกเวลาเจาะจง */}
          <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-xl">
            {period === 'daily' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white px-3 py-1.5 focus:outline-none text-sm scheme-dark"
              />
            )}
            {period === 'monthly' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white px-3 py-1.5 focus:outline-none text-sm scheme-dark"
              />
            )}
            {period === 'yearly' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-white px-3 py-1.5 focus:outline-none text-sm"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y.toString()} className="bg-zinc-900 border-none">{y}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex bg-zinc-900 border border-white/10 p-1 rounded-xl w-fit">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'daily' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'monthly' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'yearly' ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
              รายปี
            </button>
          </div>
        </div>
      </div>

      {/* Error / Loading */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-zinc-900 border border-white/5 p-6 rounded-2xl shadow-lg hover:border-amber-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {index === 0 && <span className="bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><TrendingUp size={10} /> {stat.trend}</span>}
            </div>
            <h3 className="text-zinc-400 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold font-num text-white mb-2">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">รายการจองในช่วงที่เลือก</h2>
            <p className="text-zinc-500 text-sm mt-1">แสดงรายการทั้งหมดตามสรุป {subLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'All', label: 'ทั้งหมด' },
              { id: 'Pending', label: 'รอดำเนินการ', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { id: 'Completed', label: 'เสร็จสิ้น', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
              { id: 'Cancelled', label: 'ยกเลิก', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${statusFilter === btn.id
                  ? (btn.id === 'All' ? 'bg-zinc-100 text-black border-zinc-100 shadow-lg' : `${btn.bg} ${btn.color} ${btn.border} shadow-lg scale-105`)
                  : 'bg-zinc-950 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Booking ID</th>
                <th className="px-6 py-4 font-medium">ลูกค้า</th>
                <th className="px-6 py-4 font-medium">บริการ</th>
                <th className="px-6 py-4 font-medium">วัน-เวลา</th>
                <th className="px-6 py-4 font-medium">ยอดเงิน</th>
                <th className="px-6 py-4 font-medium text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-zinc-500">กำลังโหลด...</td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-zinc-500 italic">ไม่มีรายการจองในช่วงเวลานี้</td></tr>
              ) : paginatedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-num text-zinc-500">#{booking.id}</td>
                  <td className="px-6 py-4 font-bold text-white">{booking.customer}</td>
                  <td className="px-6 py-4 text-zinc-300">{booking.service}</td>
                  <td className="px-6 py-4 font-num text-zinc-300 flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" /> {booking.time}
                  </td>
                  <td className="px-6 py-4 font-num text-white font-bold">฿{booking.price}</td>
                  <td className="px-6 py-4 text-right">{getStatusBadge(booking.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBookings.length > 0 && (
          <div className="px-6">
            <Pagination
              currentPage={dashboardPage}
              totalPages={totalPages}
              onPageChange={setDashboardPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredBookings.length}
            />
          </div>
        )}
      </div>

    </div>
  );
}