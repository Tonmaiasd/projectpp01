import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scissors,
  Star,
  Clock,
  MapPin,
  Phone,
  Facebook,
  ChevronRight
} from "lucide-react";
import { supabase } from "../supabase/client";

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Services
        const { data: svcData, error: svcError } = await supabase
          .from('services')
          .select('*')
          .order('id', { ascending: true });

        if (svcError) throw svcError;
        setServices(svcData || []);

        // Fetch Active Promotions
        const { data: promoData, error: promoError } = await supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (promoError) throw promoError;
        setPromotions(promoData || []);

      } catch (err) {
        console.error('Error fetching data for Home:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ข้อมูลสำรองเผื่อกรณีโหลดไม่สำเร็จ หรือตารางว่าง
  const fallbackServices = [
    { name: "Haircut", price: "450", description: "ตัดผมออกแบบทรงตามสไตล์", img_url: "https://images.unsplash.com/photo-1593702295094-aea8c5c13d99?q=80&w=1974&auto=format&fit=crop" },
    { name: "Hot Shave", price: "350", description: "โกนหนวดพร้อมผ้าร้อน", img_url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=2070&auto=format&fit=crop" },
    { name: "Coloring", price: "1,200", description: "ทำสีผมแฟชั่นและปิดผมขาว", img_url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop" },
    { name: "Full Set", price: "800", description: "ตัดผม + โกนหนวด + เซ็ตทรง", img_url: "https://images.unsplash.com/photo-1503951914205-b27cfca5639e?q=80&w=2070&auto=format&fit=crop" },
  ];

  const fallbackPromotions = [
    { title: "Father & Son", code: "FAMILY", discount_text: "700 บาท", description: "แพ็คเกจคู่พ่อลูกสุดคุ้ม ตัดผมพร้อมกันในบรรยากาศส่วนตัว", type: 'family' },
    { title: "Happy Hour", code: "HAPPY", discount_text: "15% OFF", description: "ตัดผมช่วงบ่ายวันธรรมดา (13:00 - 16:00 น.) ลดพิเศษ", type: 'best' },
    { title: "Student Cut", code: "STUDENT", discount_text: "300 บาท", description: "ราคาพิเศษสำหรับนักเรียน เพียงแสดงบัตรประจำตัว", type: 'student' }
  ];

  const displayServices = services.length > 0 ? services : fallbackServices;
  const displayPromotions = promotions.length > 0 ? promotions : fallbackPromotions;

  return (
    <div className="bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* --- HERO SECTION --- */}
      {/* เพิ่มความสูง min-h เป็น 700px */}
      <section id="home" className="relative min-h-[700px] lg:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
            alt="Barbershop Background"
            className="w-full h-full object-cover scale-105 animate-[kenburns_20s_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        </div>

        {/* ขยายความกว้างสูงสุดเป็น 1400px และเพิ่ม gap */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center pt-12">
          <div>
            <div className="flex items-center gap-5 mb-8">
              <div className="h-[3px] w-16 bg-amber-500"></div>
              <span className="text-amber-500 uppercase tracking-[0.3em] text-base font-bold">Est. 2024 • Sakon Nakhon</span>
            </div>
            {/* เพิ่มขนาด Font Headline */}
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-bold text-white leading-[1.1] mb-10 drop-shadow-2xl">
              Unleash Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 italic pr-4">
                Best Look
              </span>
            </h1>
            {/* เพิ่มขนาด Font เนื้อหา */}
            <p className="text-zinc-300 text-xl md:text-2xl max-w-xl mb-12 leading-relaxed font-light pl-8 border-l-4 border-amber-500">
              สัมผัสประสบการณ์การตัดผมระดับพรีเมียม ที่ผสมผสานศิลปะดั้งเดิมเข้ากับสไตล์สมัยใหม่ ดูแลโดยช่างผู้เชี่ยวชาญ
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* ขยายขนาดปุ่ม */}
              <button
                onClick={() => navigate("/booking")}
                className="px-10 py-5 text-lg bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest transition-all duration-300 text-center rounded-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transform hover:-translate-y-1"
              >
                ดูบริการของเรา
              </button>
              <a href="#contact" className="px-10 py-5 text-lg border border-white/20 text-white font-bold tracking-widest hover:bg-white/10 transition-all duration-300 text-center flex items-center justify-center gap-3 group rounded-sm">
                ติดต่อจองคิว <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="absolute -inset-6 border border-amber-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="relative rounded-t-full overflow-hidden border-b-8 border-amber-500 shadow-2xl shadow-amber-500/20">
              {/* ขยายความสูงรูป */}
              <img
                src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop"
                alt="Barber working"
                className="w-full h-[700px] object-cover grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      {/* เพิ่ม Padding บนล่าง */}
      <section id="services" className="py-24 md:py-40 bg-zinc-950 relative">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-amber-500 uppercase tracking-widest text-sm font-bold mb-4 block">Our Services</span>
            <h2 className="text-5xl md:text-7xl font-serif text-white mb-8">บริการระดับ Masterpiece</h2>
            <div className="w-32 h-2 bg-amber-500 mx-auto rounded-full"></div>
          </div>
          {/* ขยายความสูง Card และขนาด Font */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayServices.map((service, idx) => (
              <div key={idx} onClick={() => navigate("/booking")} className="group relative h-[500px] overflow-hidden border border-white/10 cursor-pointer rounded-xl">
                <img src={service.img_url} alt={service.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-90 h-1/2 mt-auto"></div>
                <div className="absolute bottom-0 left-0 w-full p-10 transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300 z-10">
                  <div className="flex justify-between items-end border-b border-white/20 pb-6 mb-6">
                    <h3 className="text-3xl font-serif text-white italic">{service.name}</h3>
                    <span className="text-amber-500 font-bold text-2xl">{service.price}.-</span>
                  </div>
                  <p className="text-zinc-400 text-base opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PROMOTIONS SECTION --- */}
      <section id="Promotions" className="py-32 bg-gradient-to-b from-zinc-900 to-black border-t border-white/5 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="text-amber-500 uppercase tracking-widest text-sm font-bold mb-4 block">Special Offers</span>
            <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">โปรโมชั่นประจำเดือน</h2>
            <div className="w-24 h-2 bg-amber-500 mx-auto rounded-full"></div>
          </div>
          {/* เพิ่มขนาด Padding และ Font ใน Card */}
          <div className="grid md:grid-cols-3 gap-10">
            {displayPromotions.map((promo, idx) => {
              // กำหนดสไตล์ Best Value สำหรับอันที่ 2 หรือตัวที่มี type 'best'
              const isBest = promo.type === 'best' || idx === 1;
              const Icon = idx === 0 ? Scissors : idx === 1 ? Clock : Star;

              return (
                <div key={idx} className={`group p-10 rounded-3xl relative transition-all duration-300 hover:-translate-y-2 border ${isBest
                  ? 'bg-gradient-to-b from-zinc-800 to-zinc-900 border-amber-500/30 transform md:scale-105 shadow-2xl shadow-amber-900/10 z-10'
                  : 'bg-zinc-800/30 backdrop-blur-sm border-white/10 hover:border-amber-500/50 hover:bg-zinc-800/80'}`}>

                  {isBest && <div className="absolute top-0 inset-x-0 h-2 bg-amber-500"></div>}

                  <div className={`absolute top-5 right-5 text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${isBest
                    ? 'bg-amber-500 text-black animate-pulse border-amber-500'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                    {promo.code}
                  </div>

                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-8 transition-transform duration-300 shadow-lg ${isBest
                    ? 'bg-amber-500 shadow-amber-500/20 group-hover:rotate-12'
                    : 'bg-zinc-950 border border-white/10 group-hover:scale-110 shadow-black/50'}`}>
                    <Icon className={isBest ? "text-black" : "text-amber-500"} size={28} />
                  </div>

                  <h3 className="text-3xl font-serif text-white mb-3 italic">{promo.title}</h3>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed border-b border-white/5 pb-8 min-h-[80px]">
                    {promo.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{isBest ? 'Special Offer' : 'Exclusive'}</span>
                      <span className={`text-2xl font-bold ${isBest ? 'text-amber-500' : 'text-white'}`}>
                        {promo.discount_text.replace(' บาท', '')} <span className={isBest ? "text-sm font-normal text-white" : "text-sm font-normal text-amber-500"}>
                          {promo.discount_text.includes('%') ? 'OFF' : 'บาท'}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("/booking")}
                      className={`px-6 py-3 font-bold rounded-xl text-sm transition-all shadow-lg ${isBest
                        ? 'bg-amber-500 hover:bg-white text-black shadow-amber-500/20'
                        : 'bg-white/5 hover:bg-amber-500 text-white hover:text-black border border-white/10'}`}
                    >
                      จองเลย
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- REVIEWS SECTION --- */}
      <section id="reviews" className="py-32 md:py-40 relative overflow-hidden bg-zinc-950">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px]"></div>
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <h2 className="text-5xl md:text-6xl font-serif text-white mb-20 text-center">ลูกค้าพูดถึงเราว่า...</h2>
          {/* เพิ่มขนาด Font และ Padding Card */}
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { name: "คุณกิตติ", role: "นักธุรกิจ", text: "บรรยากาศดีมากครับ ช่างตัดละเอียด ใส่ใจทุกจุดจริงๆ ไม่ผิดหวังเลย" },
              { name: "คุณมาร์ค", role: "Designer", text: "ชอบสไตล์ร้านและความเป็นมืออาชีพ ตัดออกมาได้ตรงตามที่ขอเป๊ะๆ แนะนำครับ" },
              { name: "คุณเจ", role: "Artist", text: "บริการพรีเมียมสมราคา เพลงเพราะ กาแฟอร่อย และทรงผมที่ได้คือที่สุด" }
            ].map((review, i) => (
              <div key={i} className="bg-zinc-900/50 backdrop-blur-sm p-12 border border-white/5 hover:border-amber-500/50 transition-all duration-300 group rounded-2xl">
                <div className="flex gap-2 mb-8">
                  {[...Array(5)].map((_, j) => <Star key={j} size={20} className="fill-amber-500 text-amber-500" />)}
                </div>
                <p className="text-xl text-zinc-300 mb-10 leading-relaxed font-serif italic">"{review.text}"</p>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-amber-500 font-serif text-2xl border border-white/10 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{review.name}</h4>
                    <span className="text-zinc-500 text-base">{review.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-32 bg-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="grid lg:grid-cols-2">
              <div className="p-14 md:p-20 flex flex-col justify-center relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                {/* เพิ่มขนาด Font Headline */}
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-12 relative z-10 flex items-center gap-4">
                  <MapPin className="text-amber-500" size={40} />
                  หล่อเลย คัทซ์
                </h2>
                <div className="space-y-10 relative z-10">
                  {/* เพิ่มขนาด Icon และ Text ใน List */}
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shrink-0"><MapPin size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">ที่อยู่ร้าน</p>
                      <p className="text-xl text-white font-sans leading-relaxed">เลขที่ 272/47 ถนนเทศบาลสงเคราะห์ <br /> อำเภอเมืองสกลนคร จังหวัดสกลนคร 47000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shrink-0"><Phone size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">สอบถาม</p>
                      <a href="tel:0922689270" className="text-3xl font-sans font-bold text-white hover:text-amber-500 transition-colors tracking-wide">092-268-9270</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shrink-0"><Facebook size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">ติดตามผลงาน</p>
                      <a href="#" className="text-2xl font-serif text-white hover:text-amber-500 transition-colors flex items-center gap-3">เพจร้านหล่อเลย คัทซ์ <ChevronRight size={24} /></a>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shrink-0"><Clock size={28} /></div>
                    <div className="w-full max-w-sm">
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-3">เวลาเปิด - ปิด</p>
                      <ul className="space-y-3">
                        <li className="flex justify-between text-zinc-300 border-b border-white/5 pb-3 border-dashed"><p className="text-white text-lg">เปิดบริการทุกวัน <span className="text-amber-500 font-bold ml-2">14:00 - 21:00 น.</span></p></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              {/* เพิ่มความสูงแผนที่ */}
              <div className="h-[500px] lg:h-auto bg-zinc-800 relative w-full">
                <iframe title="Google Map ร้านหล่อเลย" src="https://maps.google.com/maps?q=ร้านหล่อเลย+272/47+ถนนเทศบาลสงเคราะห์+สกลนคร&t=&z=17&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style={{ border: 0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 w-full h-full"></iframe>
                <div className="absolute bottom-8 right-8">
                  <a href="https://www.google.com/maps/search/?api=1&query=ร้านหล่อเลย+272/47+ถนนเทศบาลสงเคราะห์+สกลนคร" target="_blank" rel="noreferrer" className="bg-amber-500 text-black px-8 py-4 rounded-full font-bold shadow-lg hover:bg-white transition-colors flex items-center gap-3 text-base font-sans"><MapPin size={20} /> นำทาง (Google Maps)</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}