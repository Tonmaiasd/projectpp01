import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase/client';
import {
    CalendarX, Trash2, Clock, Calendar as CalendarIcon,
    AlertCircle, CheckCircle, XCircle, Plus, X
} from 'lucide-react';
import SERVER_URL from '../../config/api';

export default function AdminHolidays() {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(null);
    const [isProcessingBusy, setIsProcessingBusy] = useState(false);
    const [showBusyModal, setShowBusyModal] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    // --- State สำหรับ Custom Confirmation Modal ---
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning'
    });

    // --- State สำหรับ Form ประกาศปิดร้าน/ไม่ว่าง ---
    const [busyForm, setBusyForm] = useState({
        mode: 'range', // 'range' | 'full' | 'multi'
        date: new Date().toLocaleDateString('en-CA'),
        endDate: new Date().toLocaleDateString('en-CA'),
        startTime: '09:00',
        endTime: '17:00',
    });

    // วันที่สูงสุดที่ประกาศปิดได้ (60 วันข้างหน้า)
    const maxClosureDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 60);
        return d.toLocaleDateString('en-CA');
    }, []);

    // ช่วงเวลา 09:00 – 20:00 ทุก 1 ชั่วโมง
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = 9; hour <= 20; hour++) {
            const h = hour.toString().padStart(2, '0');
            slots.push(`${h}:00`);
        }
        return slots;
    }, []);

    // ดึงข้อมูลวันหยุด
    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_busy_times')
                .select('*')
                .order('busy_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;
            setHolidays(data || []);
        } catch (err) {
            console.error('Error fetching holidays:', err);
            showNotification('ไม่สามารถโหลดข้อมูลวันหยุดได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    const showNotification = (message, type = 'info') => {
        setNotification({ show: true, message, type });
    };

    // --- Delete ---
    const handleDelete = (id) => {
        setConfirmConfig({
            title: 'ยืนยันการยกเลิกวันหยุด',
            message: 'คุณต้องการยกเลิกวันหยุดนี้ใช่หรือไม่? การยกเลิกจะทำให้ลูกค้าสามารถกลับมาจองช่วงเวลานี้ได้ตามปกติ',
            onConfirm: () => executeDelete(id),
            type: 'danger'
        });
        setShowConfirmModal(true);
    };

    const executeDelete = async (id) => {
        setShowConfirmModal(false);
        setIsDeleting(id);
        try {
            const response = await fetch(`${SERVER_URL}/api/delete-holiday`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to delete');
            }

            showNotification('ลบรายการวันหยุดเรียบร้อยแล้ว', 'success');
            fetchHolidays();
        } catch (err) {
            console.error('Error deleting holiday:', err);
            showNotification(err.message || 'ไม่สามารถลบรายการได้', 'error');
        } finally {
            setIsDeleting(null);
        }
    };

    // --- Submit Busy/Closure ---
    const handleBusySubmit = (e) => {
        e.preventDefault();
        const { date, endDate, mode } = busyForm;

        let confirmMsg = '';
        if (mode === 'full') {
            confirmMsg = `ต้องการยกเลิกคิวทั้งหมดในวันที่ ${date} ใช่หรือไม่?`;
        } else if (mode === 'multi') {
            confirmMsg = `ต้องการยกเลิกคิวทั้งหมดตั้งแต่วันที่ ${date} ถึง ${endDate} ใช่หรือไม่?`;
        } else {
            confirmMsg = `ต้องการยกเลิกคิวในช่วงเวลา ${busyForm.startTime} - ${busyForm.endTime} ของวันที่ ${date} ใช่หรือไม่?`;
        }

        setConfirmConfig({
            title: 'ยืนยันการดำเนินการ',
            message: confirmMsg,
            onConfirm: () => executeBusySubmit(date, endDate),
            type: 'danger',
        });
        setShowConfirmModal(true);
    };

    const executeBusySubmit = async (confirmDate, confirmEndDate) => {
        setShowConfirmModal(false);
        setIsProcessingBusy(true);
        try {
            let endpoint = '';
            let body = {};

            if (busyForm.mode === 'full') {
                endpoint = `${SERVER_URL}/api/cancel-full-day-bookings`;
                body = { date: confirmDate };
            } else if (busyForm.mode === 'multi') {
                endpoint = `${SERVER_URL}/api/cancel-multi-day-bookings`;
                body = { startDate: confirmDate, endDate: confirmEndDate };
            } else {
                endpoint = `${SERVER_URL}/api/cancel-time-range-bookings`;
                body = { date: confirmDate, startTime: busyForm.startTime, endTime: busyForm.endTime };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText.slice(0, 100)}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON กรุณารีสตาร์ทเซิร์ฟเวอร์หลังบ้านครับ');
            }

            const result = await response.json();
            showNotification(result.message, 'success');
            setShowBusyModal(false);
            fetchHolidays();
        } catch (error) {
            console.error('Busy submit error:', error);
            showNotification(error.message, 'error');
        } finally {
            setIsProcessingBusy(false);
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">จัดการวันหยุดร้าน</h2>
                    <p className="text-zinc-400">ดูและจัดการช่วงเวลาที่คุณปิดร้านล่วงหน้า</p>
                </div>
                <button
                    onClick={() => setShowBusyModal(true)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 active:scale-95 shrink-0"
                >
                    <Clock size={18} /> ประกาศไม่ว่าง / ปิดร้าน
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                            <CalendarX size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-400">รายการวันหยุดทั้งหมด</p>
                            <p className="text-2xl font-serif font-bold text-white">{holidays.length} รายการ</p>
                        </div>
                    </div>
                </div>
            </div>


            {/* Holidays Split: Upcoming + Past */}
            {(() => {
                const groupConsecutiveHolidays = (list) => {
                    if (!list || list.length === 0) return [];
                    const sorted = [...list].sort((a, b) => a.busy_date.localeCompare(b.busy_date));
                    const grouped = [];
                    let currentGroup = null;

                    sorted.forEach((h) => {
                        if (!currentGroup) {
                            currentGroup = { ...h, dateRange: [h.busy_date], ids: [h.id] };
                        } else {
                            const lastDateStr = currentGroup.dateRange[currentGroup.dateRange.length - 1];
                            const lastDate = new Date(lastDateStr);
                            const currDate = new Date(h.busy_date);
                            const diffDays = Math.round((currDate - lastDate) / (1000 * 3600 * 24));

                            if (diffDays === 1 &&
                                currentGroup.is_full_day === h.is_full_day &&
                                currentGroup.start_time === h.start_time &&
                                currentGroup.end_time === h.end_time) {
                                currentGroup.dateRange.push(h.busy_date);
                                currentGroup.ids.push(h.id);
                            } else {
                                grouped.push(currentGroup);
                                currentGroup = { ...h, dateRange: [h.busy_date], ids: [h.id] };
                            }
                        }
                    });
                    if (currentGroup) grouped.push(currentGroup);
                    return grouped;
                };

                const formatDateRange = (dates) => {
                    if (dates.length === 1) {
                        return new Date(dates[0]).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                    }
                    const d1 = new Date(dates[0]);
                    const d2 = new Date(dates[dates.length - 1]);
                    if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
                        const monthYear = d1.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                        return `${d1.getDate()} - ${d2.getDate()} ${monthYear}`;
                    }
                    return `${d1.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${d2.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                };

                const todayStr = new Date().toLocaleDateString('en-CA');
                const upcoming = groupConsecutiveHolidays(holidays.filter(h => h.busy_date >= todayStr));
                const past = groupConsecutiveHolidays(holidays.filter(h => h.busy_date < todayStr)).reverse();

                const renderTable = (list, emptyText) => (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">วันที่</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">เวลา</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">โหมด</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan="4" className="px-6 py-10 text-center text-zinc-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin"></div>
                                            กำลังโหลดข้อมูล...
                                        </div>
                                    </td></tr>
                                ) : list.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-10 text-center text-zinc-500 italic">{emptyText}</td></tr>
                                ) : list.map((holiday) => (
                                    <tr key={holiday.ids[0]} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <CalendarIcon size={18} className="text-zinc-500" />
                                                <span className="text-white font-num font-bold">
                                                    {formatDateRange(holiday.dateRange)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Clock size={18} className="text-zinc-500" />
                                                <span className="text-zinc-300 font-num">
                                                    {holiday.is_full_day
                                                        ? 'หยุดทั้งวัน'
                                                        : `${holiday.start_time.slice(0, 5)} - ${holiday.end_time.slice(0, 5)} น.`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${holiday.is_full_day
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                }`}>
                                                {holiday.is_full_day ? 'Shop Closure' : 'Busy Range'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(holiday.ids)}
                                                disabled={holiday.ids.includes(isDeleting)}
                                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="ลบรายการ"
                                            >
                                                {holiday.ids.includes(isDeleting) ? (
                                                    <div className="w-4 h-4 border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

                return (
                    <div className="space-y-6">
                        {/* Upcoming */}
                        <div className="bg-zinc-900/50 rounded-3xl border border-amber-500/10 overflow-hidden backdrop-blur-sm">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                    <h3 className="font-bold text-lg text-white">ที่จะหยุดข้างหน้า</h3>
                                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{upcoming.length} รายการ</span>
                                </div>
                                <button onClick={fetchHolidays} className="text-amber-500 hover:text-amber-400 text-sm font-bold transition-colors">รีเฟรช</button>
                            </div>
                            {renderTable(upcoming, 'ไม่มีรายการวันหยุดที่จะมาถึง')}
                        </div>

                        {/* Past */}
                        <div className="bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-sm opacity-70">
                            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500"></div>
                                <h3 className="font-bold text-lg text-zinc-400">ที่หยุดไปแล้ว</h3>
                                <span className="text-xs font-bold text-zinc-500 bg-zinc-800 border border-white/5 px-2 py-0.5 rounded-full">{past.length} รายการ</span>
                            </div>
                            {renderTable(past, 'ไม่มีประวัติวันหยุดย้อนหลัง')}
                        </div>
                    </div>
                );
            })()}


            {/* --- Busy / Closure MODAL --- */}
            {showBusyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Clock size={20} className="text-red-500" />
                                ประกาศไม่ว่าง / ปิดร้าน
                            </h3>
                            <button
                                onClick={() => setShowBusyModal(false)}
                                className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl mb-6">
                            <p className="text-red-400 text-xs leading-relaxed flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                การแจ้งไม่ว่างจะยกเลิกคิว (Pending) ทั้งหมดในช่วงเวลาที่เลือก และส่งข้อความ LINE แจ้งลูกค้าโดยอัตโนมัติ
                            </p>
                        </div>

                        <form onSubmit={handleBusySubmit} className="space-y-5">
                            {/* Mode Selector */}
                            <div className="flex p-1 bg-zinc-950 rounded-xl border border-white/5">
                                {[
                                    { key: 'range', label: 'ระบุช่วงเวลา' },
                                    { key: 'full', label: 'หยุดร้าน' },
                                    { key: 'multi', label: 'หยุดหลายวัน' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setBusyForm({ ...busyForm, mode: key })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${busyForm.mode === key
                                            ? 'bg-zinc-800 text-white border border-white/10 shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-400'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Date Fields */}
                            {busyForm.mode === 'multi' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">เริ่มหยุดวันที่</label>
                                        <input type="date" value={busyForm.date}
                                            min={new Date().toLocaleDateString('en-CA')} max={maxClosureDate}
                                            onChange={(e) => setBusyForm({ ...busyForm, date: e.target.value })}
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white font-num focus:border-red-500/50 outline-none scheme-dark" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">หยุดถึงวันที่</label>
                                        <input type="date" value={busyForm.endDate}
                                            min={busyForm.date} max={maxClosureDate}
                                            onChange={(e) => setBusyForm({ ...busyForm, endDate: e.target.value })}
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white font-num focus:border-red-500/50 outline-none scheme-dark" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-sm text-zinc-400 mb-2 block">วันที่ดำเนินการ</label>
                                    <input type="date" value={busyForm.date}
                                        min={new Date().toLocaleDateString('en-CA')} max={maxClosureDate}
                                        onChange={(e) => setBusyForm({ ...busyForm, date: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white font-num focus:border-red-500/50 outline-none scheme-dark" />
                                </div>
                            )}

                            {busyForm.mode === 'range' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">เวลาเริ่มต้น</label>
                                        <select value={busyForm.startTime}
                                            onChange={(e) => setBusyForm({ ...busyForm, startTime: e.target.value })}
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500/50 outline-none font-num">
                                            {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-2 block">เวลาสิ้นสุด</label>
                                        <select value={busyForm.endTime}
                                            onChange={(e) => setBusyForm({ ...busyForm, endTime: e.target.value })}
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-red-500/50 outline-none font-num">
                                            {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowBusyModal(false)}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isProcessingBusy}
                                    className="flex-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                                    {isProcessingBusy ? (
                                        <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>กำลังดำเนินการ...</>
                                    ) : 'ยืนยันประกาศไม่ว่าง'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className={`h-2 w-full ${confirmConfig.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="p-8 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmConfig.type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {confirmConfig.type === 'danger' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{confirmConfig.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-8">{confirmConfig.message}</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={confirmConfig.onConfirm}
                                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'}`}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {notification.show && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotification({ ...notification, show: false })}></div>
                    <div className="bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 p-8 text-center relative z-10 animate-[slideUp_0.3s_ease-out]">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${notification.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                            {notification.type === 'error' ? <XCircle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">
                            {notification.type === 'error' ? 'เกิดข้อผิดพลาด' : 'สำเร็จ'}
                        </h4>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-8">{notification.message}</p>
                        <button
                            onClick={() => setNotification({ ...notification, show: false })}
                            className="w-full py-3 bg-amber-500 text-black hover:bg-amber-400 rounded-xl font-bold transition-all shadow-lg"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
