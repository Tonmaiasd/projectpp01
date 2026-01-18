import React, { useState } from "react";
import { MapPin, Phone, Clock, Facebook, Send, MessageSquare } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`ขอบคุณครับคุณ ${form.name} ทางร้านได้รับข้อความแล้ว และจะติดต่อกลับโดยเร็วที่สุด`);
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-28 pb-20 font-sans selection:bg-amber-500 selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&family=Prompt:wght@300;400;500;600;700&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-num { font-family: 'Prompt', sans-serif; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-16 animate-[fadeIn_0.5s_ease-out]">
          <span className="text-amber-500 font-bold tracking-widest uppercase text-xs mb-2 block">Get In Touch</span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">ติดต่อเรา</h1>
          <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          
          {/* Left: Contact Info */}
          <div className="space-y-8 animate-[slideRight_0.5s_ease-out]">
             <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
                <h3 className="text-2xl font-serif font-bold text-white mb-6 flex items-center gap-3">
                   <MapPin className="text-amber-500" /> ที่อยู่ร้าน
                </h3>
                <p className="text-zinc-400 leading-relaxed text-lg">
                   เลขที่ 272/47 ถนนเทศบาลสงเคราะห์ <br/>
                   อำเภอเมืองสกลนคร จังหวัดสกลนคร 47000
                </p>
             </div>

             <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-lg hover:border-amber-500/30 transition-all">
                   <Phone className="text-amber-500 w-8 h-8 mb-4" />
                   <h4 className="font-bold text-lg text-white mb-1">เบอร์โทรศัพท์</h4>
                   <a href="tel:0922689270" className="text-zinc-400 hover:text-white transition-colors font-num text-lg">092-268-9270</a>
                </div>
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-lg hover:border-amber-500/30 transition-all">
                   <Clock className="text-amber-500 w-8 h-8 mb-4" />
                   <h4 className="font-bold text-lg text-white mb-1">เวลาทำการ</h4>
                   <p className="text-zinc-400 font-num">14:00 - 21:00 น.</p>
                   <p className="text-xs text-amber-500 mt-1">เปิดบริการทุกวัน</p>
                </div>
             </div>

             <a 
               href="https://www.facebook.com/p/%E0%B8%AB%E0%B8%A5%E0%B9%88%E0%B8%AD%E0%B9%80%E0%B8%A5%E0%B8%A2-%E0%B8%84%E0%B8%B1%E0%B8%97%E0%B8%8B%E0%B9%8C-100063526962016/" 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center justify-center gap-3 w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 group"
             >
                <Facebook size={24} /> ติดตามเพจ Facebook <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
             </a>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-zinc-900 p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl animate-[slideLeft_0.5s_ease-out]">
             <h3 className="text-2xl font-serif font-bold text-white mb-2 flex items-center gap-3">
                <MessageSquare className="text-amber-500"/> ส่งข้อความถึงเรา
             </h3>
             <p className="text-zinc-500 mb-8">มีคำถามหรือข้อสงสัย? กรอกแบบฟอร์มด้านล่างได้เลย</p>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-zinc-400 mb-2">ชื่อของคุณ</label>
                   <input 
                     type="text" 
                     required
                     value={form.name}
                     onChange={(e) => setForm({...form, name: e.target.value})}
                     className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                     placeholder="ระบุชื่อ..."
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-400 mb-2">อีเมลติดต่อกลับ</label>
                   <input 
                     type="email" 
                     required
                     value={form.email}
                     onChange={(e) => setForm({...form, email: e.target.value})}
                     className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors"
                     placeholder="name@example.com"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-400 mb-2">ข้อความ</label>
                   <textarea 
                     required
                     rows="4"
                     value={form.message}
                     onChange={(e) => setForm({...form, message: e.target.value})}
                     className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-colors resize-none"
                     placeholder="พิมพ์ข้อความของคุณที่นี่..."
                   />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
                >
                   <Send size={18} /> ส่งข้อความ
                </button>
             </form>
          </div>

        </div>

        {/* Full Width Map */}
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-[400px] md:h-[500px] grayscale hover:grayscale-0 transition-all duration-700 animate-[fadeIn_1s_ease-out]">
            <iframe 
              title="Google Map ร้านหล่อเลย" 
              src="https://maps.google.com/maps?q=ร้านหล่อเลย+272/47+ถนนเทศบาลสงเคราะห์+สกลนคร&t=&z=17&ie=UTF8&iwloc=&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
        </div>

      </div>
    </div>
  );
}