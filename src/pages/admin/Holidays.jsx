import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { CalendarX, Trash2, Clock, Calendar as CalendarIcon, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminHolidays() {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

    // --- State สำหรับ Custom Confirmation Modal ---
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' // 'warning' | 'danger' | 'info'
    });

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
            const response = await fetch('http://localhost:3001/api/delete-holiday', {
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

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">จัดการวันหยุดร้าน</h2>
                    <p className="text-zinc-400">ดูและจัดการช่วงเวลาที่คุณปิดร้านล่วงหน้า</p>
                </div>
            </div>

            {/* Stats/Infos */}
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

            {/* Holidays List */}
            <div className="bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white">รายการวันหยุดและเวลาไม่ว่าง</h3>
                    <button
                        onClick={fetchHolidays}
                        className="text-amber-500 hover:text-amber-400 text-sm font-bold transition-colors"
                    >
                        รีเฟรชข้อมูล
                    </button>
                </div>

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
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin"></div>
                                            กำลังโหลดข้อมูล...
                                        </div>
                                    </td>
                                </tr>
                            ) : holidays.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                                        ไม่พบรายการวันหยุดที่ประกาศไว้
                                    </td>
                                </tr>
                            ) : (
                                holidays.map((holiday) => (
                                    <tr key={holiday.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <CalendarIcon size={18} className="text-zinc-500" />
                                                <span className="text-white font-num font-bold">
                                                    {new Date(holiday.busy_date).toLocaleDateString('th-TH', {
                                                        day: 'numeric', month: 'long', year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Clock size={18} className="text-zinc-500" />
                                                <span className="text-zinc-300 font-num">
                                                    {holiday.is_full_day
                                                        ? "หยุดทั้งวัน"
                                                        : `${holiday.start_time.slice(0, 5)} - ${holiday.end_time.slice(0, 5)} น.`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${holiday.is_full_day
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                }`}>
                                                {holiday.is_full_day ? "Shop Closure" : "Busy Range"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(holiday.id)}
                                                disabled={isDeleting === holiday.id}
                                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="ลบรายการ"
                                            >
                                                {isDeleting === holiday.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-500/50 border-t-red-500 rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Confirmation Modal (Card Style) */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className={`h-2 w-full ${confirmConfig.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                        <div className="p-8 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmConfig.type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
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
                                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                                        }`}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotification({ ...notification, show: false })}></div>
                    <div className="bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 p-8 text-center relative z-10 animate-[slideUp_0.3s_ease-out]">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${notification.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                            }`}>
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
