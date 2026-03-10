import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Tag, Plus, Calendar, Percent, ToggleRight, ToggleLeft, Edit3, Trash2, X, Save, Check } from 'lucide-react';
import { supabase } from '../../supabase/client';
import Pagination from '../../components/Pagination';
import { formatDate } from '../../utils/formatDate';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null); // null = Add, object = Edit
  const [promotionsPage, setPromotionsPage] = useState(1); // Pagination

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const dateInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    discount_text: '',
    expire_date: '',
    active: true,
  });

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchPromotions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPromotions(data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching promotions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromotions();
  }, []);

  // Pagination for promotions
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(promotions.length / ITEMS_PER_PAGE));
  const paginatedPromotions = useMemo(() => {
    const start = (promotionsPage - 1) * ITEMS_PER_PAGE;
    return promotions.slice(start, start + ITEMS_PER_PAGE);
  }, [promotions, promotionsPage]);

  // Toggle Active Status
  const handleToggleActive = async (id, active, expireDate) => {
    // Check if trying to activate an expired promotion
    if (!active && expireDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(expireDate);
      if (expDate < today) {
        showNotification('โปรโมชั่นหมดอายุแล้ว กรุณาแก้ไขวันหมดอายุก่อนเปิดใช้งาน', 'warning');
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('promotions')
        .update({ active: !active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setPromotions((prev) => prev.map(p => p.id === id ? data : p));
      showNotification(active ? 'ปิดใช้งานโปรโมชั่นแล้ว' : 'เปิดใช้งานโปรโมชั่นแล้ว', 'success');
    } catch (err) {
      showNotification('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message, 'error');
    }
  };

  // Open Modal for Add
  const handleAddNew = () => {
    setCurrentPromo(null);
    setFormData({ title: '', code: '', discount_text: '', expire_date: '', active: true });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleEdit = (promo) => {
    setCurrentPromo(promo);
    // Convert YYYY-MM-DD to DD/MM/YYYY for display in text input
    let displayExpire = '';
    if (promo.expire_date) {
      const [year, month, day] = promo.expire_date.split('-');
      displayExpire = `${day}/${month}/${year}`;
    }
    setFormData({
      title: promo.title || '',
      code: promo.code || '',
      discount_text: promo.discount_text || '',
      expire_date: displayExpire,
      active: promo.active ?? true,
    });
    setIsModalOpen(true);
  };

  // Pre-Delete: Open Confirmation Modal
  const handleClickDelete = (id) => {
    setDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', deleteId);
      if (error) throw error;
      setPromotions(promotions.filter(p => p.id !== deleteId));
      showNotification('ลบโปรโมชั่นเรียบร้อย', 'success');
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (err) {
      showNotification('ลบโปรโมชั่นไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  // Save Data (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.code || !formData.discount_text) {
      showNotification("กรุณากรอกข้อมูลให้ครบถ้วน", 'warning');
      return;
    }

    // Parse DD/MM/YYYY to Date object for validation or DB
    let dbExpireDate = null;
    if (formData.expire_date) {
      const parts = formData.expire_date.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        dbExpireDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        // Fallback for direct YYYY-MM-DD if any
        dbExpireDate = formData.expire_date;
      }
    }

    // Check if trying to save an active promotion with an expired date
    if (formData.active && dbExpireDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(dbExpireDate);
      if (expDate < today) {
        showNotification('วันหมดอายุต้องไม่เป็นอดีตเมื่อเปิดใช้งานโปรโมชั่น', 'warning');
        return;
      }
    }

    try {
      const payload = {
        title: formData.title,
        code: formData.code.toUpperCase(),
        discount_text: formData.discount_text,
        expire_date: dbExpireDate,
        active: formData.active,
      };

      if (currentPromo) {
        const { data, error } = await supabase
          .from('promotions')
          .update(payload)
          .eq('id', currentPromo.id)
          .select()
          .single();
        if (error) throw error;
        setPromotions(promotions.map(p => p.id === currentPromo.id ? data : p));
        showNotification("แก้ไขโปรโมชั่นเรียบร้อย", 'success');
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setPromotions([data, ...promotions]);
        showNotification("สร้างโปรโมชั่นใหม่เรียบร้อย", 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving promotion:', err);
      showNotification('บันทึกโปรโมชั่นไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">

      {/* Notification Card */}
      {notification && (
        <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 ${notification.type === 'success'
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : notification.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : notification.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
          <div className="text-xl">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </div>
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">โปรโมชั่น</h1>
          <p className="text-zinc-400 text-sm">จัดการคูปองส่วนลดและแคมเปญพิเศษ</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} /> สร้างโปรโมชั่น
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">
          โหลดโปรโมชั่นไม่สำเร็จ: {error}
        </div>
      )}

      {/* Promotions Grid */}
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center text-zinc-500 py-10">กำลังโหลด...</div>
          ) : paginatedPromotions.map((promo) => (
            <div key={promo.id} className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between gap-6 group relative overflow-hidden ${promo.active ? 'bg-zinc-900 border-amber-500/30 shadow-lg' : 'bg-zinc-950 border-white/5 opacity-70'}`}>

              {/* Background Glow for Active */}
              {promo.active && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>}

              <div className="flex-1 z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${promo.active ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                    {promo.code}
                  </span>
                  {!promo.active && <span className="text-xs text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Inactive</span>}
                </div>
                <h3 className={`text-xl font-bold mb-1 ${promo.active ? 'text-white' : 'text-zinc-500'}`}>{promo.title}</h3>
                <div className="flex items-center gap-4 text-sm text-zinc-400 mt-3">
                  <span className={`flex items-center gap-1 font-bold ${promo.active ? 'text-green-400' : 'text-zinc-500'}`}><Percent size={14} /> {promo.discount_text}</span>
                  <span className="flex items-center gap-1 font-num"><Calendar size={14} /> หมดเขต: {formatDate(promo.expire_date)}</span>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col justify-between items-end gap-3 z-10 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">

                {/* Toggle Switch */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">เปิด/ปิด ใช้งานโปรโมชั่น</span>
                  <button
                    onClick={() => handleToggleActive(promo.id, promo.active, promo.expire_date)}
                    title={promo.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${promo.active ? 'text-green-500 hover:text-green-400' : 'text-zinc-600 hover:text-zinc-500'}`}
                  >
                    {promo.active ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="แก้ไข"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleClickDelete(promo.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {promotions.length > 0 && (
          <Pagination
            currentPage={promotionsPage}
            totalPages={totalPages}
            onPageChange={setPromotionsPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={promotions.length}
          />
        )}
      </>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">

            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {currentPromo ? <Edit3 className="text-amber-500" size={20} /> : <Plus className="text-amber-500" size={20} />}
                {currentPromo ? "แก้ไขโปรโมชั่น" : "สร้างโปรโมชั่นใหม่"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">ชื่อแคมเปญ</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="เช่น โปรโมชั่นวันแม่"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">รหัสคูปอง (Code)</label>
                  <div className="relative">
                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} // Auto Uppercase
                      placeholder="SALE50"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-amber-500 outline-none uppercase font-bold tracking-wider transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">รายละเอียดส่วนลด</label>
                  <input
                    type="text"
                    required
                    value={formData.discount_text}
                    onChange={e => setFormData({ ...formData, discount_text: e.target.value })}
                    placeholder="ลด 50% / ลด 100 บาท"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">วันหมดอายุ (ว่างไว้ = ไม่มีวันหมดอายุ)</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={formData.expire_date}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9/]/g, '');
                      if (val.length === 2 && !val.includes('/')) val += '/';
                      if (val.length === 5 && val.split('/').length === 2) val += '/';
                      if (val.length > 10) val = val.slice(0, 10);
                      setFormData({ ...formData, expire_date: val });
                    }}
                    placeholder="วว/ดด/ปปปป"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-12 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                  />
                  {/* Hidden date input for picker */}
                  <input
                    type="date"
                    ref={dateInputRef}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-');
                        setFormData({ ...formData, expire_date: `${d}/${m}/${y}` });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="เลือกจากปฏิทิน"
                  >
                    <Calendar size={20} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 ml-1">* พิมพ์เองเป็น วัน/เดือน/ปี หรือกดปุ่มปฏิทินเพื่อเลือก</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ยืนยันการลบ?</h3>
              <p className="text-zinc-400 text-sm">
                คุณต้องการลบโปรโมชั่นนี้ใช่หรือไม่?<br />
                การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}