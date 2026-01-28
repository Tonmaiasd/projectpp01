import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scissors,
  Star,
  Clock,
  MapPin,
  Phone,
  Facebook,
  ChevronRight,
  MessageSquare,
  Send,
  User as UserIcon,
  Trash2
} from "lucide-react";
import { supabase } from "../supabase/client";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterStar, setFilterStar] = useState(0);

  // --- เพิ่ม State สำหรับ Card ยืนยันการลบ ---
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: svcData, error: svcError } = await supabase
          .from('services')
          .select('*')
          .order('id', { ascending: true });

        if (svcError) throw svcError;
        setServices(svcData || []);

        const { data: promoData, error: promoError } = await supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (promoError) throw promoError;
        setPromotions(promoData || []);

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

      } catch (err) {
        console.error('Error fetching data for Home:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    if (!currentUser) {
      alert("กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็นครับ");
      setCommentLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', currentUser.id)
      .single();

    const { error } = await supabase.from('comments').insert([
      {
        content: newComment,
        rating: rating,
        user_id: currentUser.id,
        user_name: profile?.full_name || 'ลูกค้าท่านหนึ่ง',
        user_avatar: profile?.avatar_url
      }
    ]);

    if (!error) {
      setNewComment("");
      setRating(5);
      fetchComments();
    }
    setCommentLoading(false);
  };

  // --- ฟังก์ชันลบคอมเมนต์แบบ Card Confirm ---
  const handleDeleteComment = async (id) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) {
      fetchComments();
    }
    setDeleteId(null); // ปิด Card หลังจากลบ
  };

  const filteredComments = filterStar === 0
    ? comments
    : comments.filter(c => c.rating === filterStar);

  const displayServices = services.length > 0 ? services : [];

  if (loading) return null;

  return (
    <div className="bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        html { scroll-behavior: smooth; }
        .swiper-pagination-bullet { background: #f59e0b !important; }
      `}</style>

      {/* --- Card ยืนยันการลบ (เด้งขึ้นมากลางจอ) --- */}
      {deleteId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
          <div className="relative bg-zinc-900 border border-white/10 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-serif text-white mb-2 text-center">ยืนยันการลบ?</h3>
            <p className="text-zinc-400 text-center mb-8 font-sans">รีวิวนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">ยกเลิก</button>
              <button onClick={() => handleDeleteComment(deleteId)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">ลบทันที</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <section id="home" className="relative min-h-[700px] lg:min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" alt="Barbershop Background" className="w-full h-full object-cover scale-105 animate-[kenburns_20s_infinite_alternate]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center pt-12">
          <div>
            <div className="flex items-center gap-5 mb-8">
              <div className="h-[3px] w-16 bg-amber-500"></div>
              <span className="text-amber-500 uppercase tracking-[0.3em] text-base font-bold">Est. 2024 • Sakon Nakhon</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-bold text-white leading-[1.1] mb-10 drop-shadow-2xl">
              Unleash Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 italic pr-4">Best Look</span>
            </h1>
            <p className="text-zinc-300 text-xl md:text-2xl max-w-xl mb-12 leading-relaxed font-light pl-8 border-l-4 border-amber-500">
              สัมผัสประสบการณ์การตัดผมระดับพรีเมียม ดูแลโดยช่างผู้เชี่ยวชาญ
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button onClick={() => navigate("/booking")} className="px-10 py-5 text-lg bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest transition-all rounded-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transform hover:-translate-y-1">ดูบริการของเรา</button>
              <a href="#contact" className="px-10 py-5 text-lg border border-white/20 text-white font-bold tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 group rounded-sm">ติดต่อจองคิว <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" /></a>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="relative rounded-t-full overflow-hidden border-b-8 border-amber-500 shadow-2xl shadow-amber-500/20">
              <img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop" alt="Barber working" className="w-full h-[700px] object-cover grayscale hover:grayscale-0 transition-all duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section id="services" className="py-24 md:py-40 bg-zinc-950 relative">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <span className="text-amber-500 uppercase tracking-widest text-sm font-bold mb-4 block">Our Services</span>
          <h2 className="text-5xl md:text-7xl font-serif text-white mb-24">บริการระดับ Masterpiece</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayServices.map((service, idx) => (
              <div key={idx} onClick={() => navigate("/booking")} className="group relative h-[500px] overflow-hidden border border-white/10 cursor-pointer rounded-xl">
                <img src={service.img_url} alt={service.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 w-full p-10 transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300 z-10 text-left">
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

      {/* --- REVIEWS SECTION --- */}
      <section id="reviews" className="py-32 md:py-40 relative overflow-hidden bg-zinc-950 border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <h2 className="text-5xl md:text-6xl font-serif text-white mb-20 text-center">ลูกค้าพูดถึงเราว่า...</h2>

          <div className="max-w-2xl mx-auto mb-16 bg-zinc-900/30 p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
            <form onSubmit={handlePostComment}>
              <div className="flex flex-col items-center gap-4 mb-6">
                <span className="text-zinc-500 uppercase tracking-widest text-xs">ให้คะแนนความพึงพอใจ</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform active:scale-90">
                      <Star size={32} className={`${star <= rating ? "fill-amber-500 text-amber-500" : "text-zinc-700 hover:text-amber-200"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="ร่วมแบ่งปันประสบการณ์ของคุณ..." className="w-full bg-zinc-900/50 border border-white/10 rounded-3xl p-6 pr-20 text-white focus:border-amber-500 outline-none transition-all h-32 resize-none text-lg" />
                <button type="submit" disabled={commentLoading || !newComment.trim()} className="absolute bottom-6 right-6 p-4 bg-amber-500 text-black rounded-2xl hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50">
                  {commentLoading ? <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : <Send size={24} />}
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button onClick={() => setFilterStar(0)} className={`px-6 py-2 rounded-full border transition-all ${filterStar === 0 ? "bg-amber-500 text-black border-amber-500 font-bold" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>ทั้งหมด</button>
            {[5, 4, 3, 2, 1].map(s => (
              <button key={s} onClick={() => setFilterStar(s)} className={`px-6 py-2 rounded-full border flex items-center gap-2 transition-all ${filterStar === s ? "bg-amber-500 text-black border-amber-500 font-bold" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
                {s} <Star size={14} className={filterStar === s ? "fill-black" : "fill-zinc-400"} />
              </button>
            ))}
          </div>

          <div className="relative group px-4">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none hidden md:block" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none hidden md:block" />

            {filteredComments.length > 0 ? (
              <Swiper
                modules={[Pagination, Autoplay]}
                spaceBetween={20}
                slidesPerView={1.2}
                centeredSlides={filteredComments.length > 1}
                loop={filteredComments.length > 3}
                pagination={{ clickable: true, dynamicBullets: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                breakpoints={{
                  768: { slidesPerView: 2.2, centeredSlides: false, spaceBetween: 30 },
                  1024: { slidesPerView: 3, centeredSlides: false, spaceBetween: 30 },
                }}
                className="pb-20 !overflow-visible"
              >
                {filteredComments.map((comment) => (
                  <SwiperSlide key={comment.id}>
                    <div className="bg-zinc-900/40 backdrop-blur-md p-10 border border-white/5 hover:border-amber-500/30 transition-all group rounded-[2.5rem] h-full flex flex-col min-h-[350px] shadow-2xl relative">

                      {/* ปุ่มลบ (ปรับตำแหน่งให้ลอยเด่นขึ้น ไม่ทับเนื้อหา) */}
                      {currentUser && currentUser.id === comment.user_id && (
                        <button
                          onClick={() => setDeleteId(comment.id)}
                          className="absolute -top-3 -right-3 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 hover:scale-110 transition-all duration-300 z-[40] border-2 border-zinc-950"
                          title="ลบรีวิวนี้"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      <MessageSquare size={60} className="absolute top-8 right-10 text-amber-500/5 pointer-events-none" />
                      <div className="flex gap-1 mb-8">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={16} className={j < (comment.rating || 5) ? "fill-amber-500 text-amber-500" : "text-zinc-800"} />
                        ))}
                      </div>
                      <p className="text-xl text-zinc-300 mb-10 leading-relaxed font-serif italic flex-grow">"{comment.content}"</p>
                      <div className="flex items-center gap-5 border-t border-white/5 pt-8">
                        {comment.user_avatar ? (
                          <img src={comment.user_avatar} className="w-14 h-14 rounded-2xl object-cover border border-amber-500/20" alt="avatar" />
                        ) : (
                          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 border border-white/10"><UserIcon size={24} /></div>
                        )}
                        <div>
                          <h4 className="text-white font-bold text-lg">{comment.user_name}</h4>
                          <span className="text-zinc-500 text-sm">{new Date(comment.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="col-span-full text-center text-zinc-600 italic py-20 font-serif text-xl">
                ยังไม่มีรีวิว {filterStar > 0 ? `${filterStar} ดาว` : ""} ในขณะนี้
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-32 bg-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
            <div className="grid lg:grid-cols-2">
              <div className="p-14 md:p-20 flex flex-col justify-center relative">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-12 flex items-center gap-4">
                  <MapPin className="text-amber-500" size={40} /> หล่อเลย คัทซ์
                </h2>
                <div className="space-y-10">
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0"><MapPin size={28} /></div>
                    <div><p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">ที่อยู่ร้าน</p><p className="text-xl text-white font-sans leading-relaxed">เลขที่ 272/47 ถนนเทศบาลสงเคราะห์ <br /> อำเภอเมืองสกลนคร จังหวัดสกลนคร 47000</p></div>
                  </div>
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0"><Phone size={28} /></div>
                    <div><p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">สอบถาม</p><a href="tel:0922689270" className="text-3xl font-sans font-bold text-white hover:text-amber-500 transition-colors">092-268-9270</a></div>
                  </div>
                  <div className="flex items-start gap-6 group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0"><Clock size={28} /></div>
                    <div><p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-3">เวลาเปิด - ปิด</p><p className="text-white text-lg">เปิดบริการทุกวัน <span className="text-amber-500 font-bold ml-2">12:00 - 21:00 น.</span></p></div>
                  </div>
                </div>
              </div>
              <div className="h-[500px] lg:h-auto bg-zinc-800 relative w-full">
                <iframe title="Google Map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3819.344400267204!2d104.1485!3d17.16!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDA5JzM2LjAiTiAxMDTCsDA4JzU0LjYiRQ!5e0!3m2!1sth!2sth!4v1643212345678" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" className="absolute inset-0"></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}