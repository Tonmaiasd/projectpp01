import React, { useEffect, useState } from 'react';
import { Tag, Plus, Calendar, Percent, ToggleRight, ToggleLeft, Edit3, Trash2, X, Save, Check } from 'lucide-react';
import { supabase } from '../../supabase/client';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null); // null = Add, object = Edit

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    discount_text: '',
    expire_date: '',
    active: true,
  });

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

  // Toggle Active Status
  const handleToggleActive = async (id, active) => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .update({ active: !active })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setPromotions((prev) => prev.map(p => p.id === id ? data : p));
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message);
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
    setFormData({
      title: promo.title || '',
      code: promo.code || '',
      discount_text: promo.discount_text || '',
      expire_date: promo.expire_date || '',
      active: promo.active ?? true,
    });
    setIsModalOpen(true);
  };

  // Delete Promotion
  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบโปรโมชั่นนี้ใช่หรือไม่?")) return;
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      setPromotions(promotions.filter(p => p.id !== id));
    } catch (err) {
      alert('ลบโปรโมชั่นไม่สำเร็จ: ' + err.message);
    }
  };

  // Save Data (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.code || !formData.discount_text) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    try {
      if (currentPromo) {
        const { data, error } = await supabase
          .from('promotions')
          .update({
            title: formData.title,
            code: formData.code.toUpperCase(),
            discount_text: formData.discount_text,
            expire_date: formData.expire_date || null,
            active: formData.active,
          })
          .eq('id', currentPromo.id)
          .select()
          .single();
        if (error) throw error;
        setPromotions(promotions.map(p => p.id === currentPromo.id ? data : p));
        alert("แก้ไขโปรโมชั่นเรียบร้อย");
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert([{
            title: formData.title,
            code: formData.code.toUpperCase(),
            discount_text: formData.discount_text,
            expire_date: formData.expire_date || null,
            active: formData.active,
          }])
          .select()
          .single();
        if (error) throw error;
        setPromotions([data, ...promotions]);
        alert("สร้างโปรโมชั่นใหม่เรียบร้อย");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving promotion:', err);
      if (err.message?.includes('row-level security') || err.message?.includes('relation')) {
        alert('❌ ข้อผิดพลาด:\nโปรดรันคำสั่ง SQL ใน Supabase:\n\n✅ CREATE_PROMOTIONS_TABLE.sql\n\nแล้วรีเฟรชหน้า');
      } else {
        alert('บันทึกโปรโมชั่นไม่สำเร็จ: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {loading ? (
          <div className="col-span-full text-center text-zinc-500 py-10">กำลังโหลด...</div>
         ) : promotions.map((promo) => (
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
                     <span className={`flex items-center gap-1 font-bold ${promo.active ? 'text-green-400' : 'text-zinc-500'}`}><Percent size={14}/> {promo.discount_text}</span>
                     <span className="flex items-center gap-1 font-num"><Calendar size={14}/> หมดเขต: {promo.expire_date || 'No Expiry'}</span>
                  </div>
               </div>
               
               <div className="flex flex-row sm:flex-col justify-between items-end gap-3 z-10 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                  
                  {/* Toggle Switch */}
                  <button 
                    onClick={() => handleToggleActive(promo.id, promo.active)}
                    title={promo.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    className={`text-3xl transition-transform hover:scale-110 active:scale-95 ${promo.active ? 'text-green-500 hover:text-green-400' : 'text-zinc-600 hover:text-zinc-500'}`}
                  >
                     {promo.active ? <ToggleRight size={36}/> : <ToggleLeft size={36}/>}
                  </button>

                  <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(promo)}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="แก้ไข"
                      >
                          <Edit3 size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                        title="ลบ"
                      >
                          <Trash2 size={16}/>
                      </button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {currentPromo ? <Edit3 className="text-amber-500" size={20}/> : <Plus className="text-amber-500" size={20}/>} 
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
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            placeholder="เช่น โปรโมชั่นวันแม่"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">รหัสคูปอง (Code)</label>
                            <div className="relative">
                                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} // Auto Uppercase
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
                                onChange={e => setFormData({...formData, discount_text: e.target.value})}
                                placeholder="ลด 50% / ลด 100 บาท"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">วันหมดอายุ (ว่างไว้ = ไม่มีวันหมดอายุ)</label>
                        <input 
                            type="date" 
                            value={formData.expire_date}
                            onChange={e => setFormData({...formData, expire_date: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                        />
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

    </div>
  );
}