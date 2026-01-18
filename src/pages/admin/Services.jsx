import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Clock, DollarSign, X, Check, Save } from 'lucide-react';

export default function Services() {
  
  // 1. Mock Data as State
  const [services, setServices] = useState([
    { id: 1, name: "Classic Haircut", price: "450", duration: "45", category: "Hair", image: "https://images.unsplash.com/photo-1593702295094-aea8c5c13d99?q=80&w=1974&auto=format&fit=crop" },
    { id: 2, name: "Hot Towel Shave", price: "350", duration: "30", category: "Shave", image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=2070&auto=format&fit=crop" },
    { id: 3, name: "Hair Coloring", price: "1200", duration: "120", category: "Color", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop" },
    { id: 4, name: "Full Grooming", price: "800", duration: "90", category: "Set", image: "https://images.unsplash.com/photo-1503951914205-b27cfca5639e?q=80&w=2070&auto=format&fit=crop" },
  ]);

  // 2. Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null); // ถ้าเป็น null คือโหมด Add, ถ้ามีค่าคือโหมด Edit

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    category: '',
    image: ''
  });

  // --- Handlers ---

  // เปิด Modal สำหรับเพิ่มบริการใหม่
  const handleAddNew = () => {
    setCurrentService(null);
    setFormData({ name: '', price: '', duration: '', category: '', image: '' });
    setIsModalOpen(true);
  };

  // เปิด Modal สำหรับแก้ไข
  const handleEdit = (service) => {
    setCurrentService(service);
    setFormData(service);
    setIsModalOpen(true);
  };

  // ลบบริการ
  const handleDelete = (id) => {
    if (window.confirm("คุณต้องการลบบริการนี้ใช่หรือไม่?")) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  // บันทึกข้อมูล (ทั้ง Add และ Edit)
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation ง่ายๆ
    if (!formData.name || !formData.price) {
        alert("กรุณากรอกชื่อและราคา");
        return;
    }

    if (currentService) {
      // Logic แก้ไข (Update)
      setServices(services.map(s => (s.id === currentService.id ? { ...formData, id: s.id } : s)));
      alert("แก้ไขข้อมูลเรียบร้อย");
    } else {
      // Logic เพิ่มใหม่ (Create)
      const newService = {
        ...formData,
        id: Date.now(), // สร้าง ID ชั่วคราว
        image: formData.image || "https://placehold.co/400x300?text=No+Image" // รูป Default ถ้าไม่ใส่
      };
      setServices([newService, ...services]);
      alert("เพิ่มบริการใหม่เรียบร้อย");
    }
    setIsModalOpen(false);
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden group hover:border-amber-500/30 transition-all shadow-lg flex flex-col">
             <div className="h-48 overflow-hidden relative bg-zinc-800">
                <img src={service.image} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                   {service.category}
                </div>
             </div>
             <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-500 transition-colors">{service.name}</h3>
                <div className="flex justify-between items-center text-sm text-zinc-400 mb-4">
                   <span className="flex items-center gap-1"><Clock size={14} className="text-amber-500"/> {service.duration} นาที</span>
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
        ))}
      </div>

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
                                value={formData.duration}
                                onChange={e => setFormData({...formData, duration: e.target.value})}
                                placeholder="30"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none font-num"
                            />
                        </div>
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
                            value={formData.image}
                            onChange={e => setFormData({...formData, image: e.target.value})}
                            placeholder="https://example.com/image.jpg"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none text-xs"
                        />
                        {formData.image && (
                            <div className="mt-2 h-32 rounded-lg overflow-hidden border border-white/10">
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
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