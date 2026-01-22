import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Clock, DollarSign, X, Check, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../supabase/client';

export default function Services() {
  
  // 1. State สำหรับข้อมูล services จาก Supabase
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null); // ถ้าเป็น null คือโหมด Add, ถ้ามีค่าคือโหมด Edit
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration_minutes: '',
    category: '',
    img_url: '',
    description: '',
    rating: 4.5,
    reviews: 0
  });

  // 3. ดึงข้อมูล services จาก Supabase
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // --- Handlers ---

  // เปิด Modal สำหรับเพิ่มบริการใหม่
  const handleAddNew = () => {
    setCurrentService(null);
    setFormData({
      name: '',
      price: '',
      duration_minutes: '',
      category: '',
      img_url: '',
      description: '',
      rating: 4.5,
      reviews: 0
    });
    setIsModalOpen(true);
  };

  // เปิด Modal สำหรับแก้ไข
  const handleEdit = (service) => {
    setCurrentService(service);
    setFormData({
      name: service.name || '',
      price: service.price || '',
      duration_minutes: service.duration_minutes || '',
      category: service.category || '',
      img_url: service.img_url || '',
      description: service.description || '',
      rating: service.rating || 4.5,
      reviews: service.reviews || 0
    });
    setIsModalOpen(true);
  };

  // ลบบริการ
  const handleDelete = async (id) => {
    if (!window.confirm("คุณต้องการลบบริการนี้ใช่หรือไม่?")) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setServices(services.filter(s => s.id !== id));
      alert("ลบบริการเรียบร้อยแล้ว");
    } catch (err) {
      alert('Error deleting service: ' + err.message);
      console.error('Error deleting service:', err);
    }
  };

  // บันทึกข้อมูล (ทั้ง Add และ Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.price) {
        alert("กรุณากรอกชื่อและราคา");
        return;
    }

    setSaving(true);
    try {
      const serviceData = {
        name: formData.name,
        price: Number(formData.price),
        duration_minutes: Number(formData.duration_minutes) || null,
        category: formData.category || null,
        img_url: formData.img_url || null,
        description: formData.description || null,
        rating: Number(formData.rating) || null,
        reviews: Number(formData.reviews) || null
      };

      if (currentService) {
        // Update
        const { data, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', currentService.id)
          .select()
          .single();

        if (error) throw error;

        setServices(services.map(s => s.id === currentService.id ? data : s));
        alert("แก้ไขข้อมูลเรียบร้อย");
      } else {
        // Insert
        const { data, error } = await supabase
          .from('services')
          .insert([serviceData])
          .select()
          .single();

        if (error) throw error;

        setServices([data, ...services]);
        alert("เพิ่มบริการใหม่เรียบร้อย");
      }

      setIsModalOpen(false);
      setFormData({
        name: '',
        price: '',
        duration_minutes: '',
        category: '',
        img_url: '',
        description: '',
        rating: 4.5,
        reviews: 0
      });
    } catch (err) {
      console.error('Error saving service:', err);
      if (err.message?.includes('row-level security')) {
        alert('❌ ข้อผิดพลาด RLS Policy:\nไม่สามารถบันทึกข้อมูลได้ เนื่องจากการตั้งค่า Row-Level Security ใน Supabase\n\n✅ วิธีแก้:\n1. ไปที่ Supabase Dashboard\n2. เลือกตาราง "services"\n3. ไปที่ RLS Policies\n4. ปิด RLS หรือสร้าง policy ที่อนุญาต INSERT/UPDATE');
      } else {
        alert('Error saving service: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">จัดการบริการ</h1>
          <p className="text-zinc-400 text-sm">เพิ่มหรือแก้ไขรายการทรงผมและราคา</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} /> เพิ่มบริการใหม่
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="ml-3 text-zinc-400">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500">
          <p>เกิดข้อผิดพลาด: {error}</p>
        </div>
      )}

      {/* Services Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.length > 0 ? (
            services.map((service) => (
              <div key={service.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg flex flex-col">
                 <div className="h-48 overflow-hidden relative bg-zinc-800">
                    <img src={service.img_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                       {service.category}
                    </div>
                 </div>
                 <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-500 transition-colors">{service.name}</h3>
                    <div className="flex justify-between items-center text-sm text-zinc-400 mb-4">
                       <span className="flex items-center gap-1"><Clock size={14} className="text-amber-500"/> {service.duration_minutes} นาที</span>
                       <span className="flex items-center gap-1 font-num text-white font-bold"><DollarSign size={14} className="text-green-500"/> {service.price}</span>
                    </div>
                    
                    <div className="flex gap-2 pt-4 border-t border-white/5 mt-auto">
                       <button 
                         onClick={() => handleEdit(service)}
                         className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                          <Edit3 size={14} /> แก้ไข
                       </button>
                       <button 
                         onClick={() => handleDelete(service.id)}
                         className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                          <Trash2 size={14} /> ลบ
                       </button>
                    </div>
                 </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-zinc-500">
              <p>ยังไม่มีรายการบริการ</p>
              <p className="text-sm mt-2">กดปุ่ม "เพิ่มบริการใหม่" เพื่อเพิ่มรายการแรก</p>
            </div>
          )}
        </div>
      )}

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {currentService ? <Edit3 className="text-amber-500" size={20}/> : <Plus className="text-amber-500" size={20}/>} 
                        {currentService ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">ชื่อบริการ</label>
                        <input 
                            type="text" 
                            required
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="เช่น ตัดผมชายวินเทจ"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">ราคา (บาท)</label>
                            <input 
                                type="number" 
                                required
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: e.target.value})}
                                placeholder="0"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">ระยะเวลา (นาที)</label>
                            <input 
                                type="number" 
                                required
                                value={formData.duration_minutes}
                                onChange={e => setFormData({...formData, duration_minutes: e.target.value})}
                                placeholder="30"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">คำอธิบาย</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder="อธิบายรายละเอียดบริการ..."
                            rows="3"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">หมวดหมู่</label>
                        <select 
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        >
                            <option value="">-- เลือกหมวดหมู่ --</option>
                            <option value="Hair">ตัดผม (Hair)</option>
                            <option value="Shave">โกนหนวด (Shave)</option>
                            <option value="Color">ทำสี (Color)</option>
                            <option value="Set">เซ็ตผม/สระ (Set/Wash)</option>
                            <option value="Spa">สปา (Spa)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">URL รูปภาพ</label>
                        <input 
                            type="text" 
                            value={formData.img_url}
                            onChange={e => setFormData({...formData, img_url: e.target.value})}
                            placeholder="https://example.com/image.jpg"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none text-xs"
                        />
                        {formData.img_url && (
                            <div className="mt-2 h-32 rounded-lg overflow-hidden border border-white/10">
                                <img src={formData.img_url} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">คะแนน (0-5)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                min="0"
                                max="5"
                                value={formData.rating}
                                onChange={e => setFormData({...formData, rating: e.target.value})}
                                placeholder="4.5"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">จำนวนรีวิว</label>
                            <input 
                                type="number" 
                                min="0"
                                value={formData.reviews}
                                onChange={e => setFormData({...formData, reviews: e.target.value})}
                                placeholder="0"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                            />
                        </div>
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
                            disabled={saving}
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save size={18} /> บันทึกข้อมูล
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}