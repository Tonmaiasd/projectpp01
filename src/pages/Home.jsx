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
  Trash2,
  Tag,
  Calendar
} from "lucide-react";
import { supabase } from "../supabase/client";

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

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

  const [deleteId, setDeleteId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      setShowLoginModal(true);
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

  const handleDeleteComment = async (id) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) {
      fetchComments();
    }
    setDeleteId(null);
  };

  const filteredComments = filterStar === 0
    ? comments
    : comments.filter(c => c.rating === filterStar);

  const displayServices = services.length > 0 ? services : [];

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        html { scroll-behavior: smooth; }
        .swiper-pagination-bullet { background: #f59e0b !important; }
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
      `}</style>

      {/* --- Login Required Modal --- */}
      {showLoginModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl p-10 text-center animate-[slideUp_0.4s_ease-out] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-amber-500 to-amber-600"></div>

            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
              <UserIcon size={40} />
            </div>

            <h3 className="text-2xl font-serif font-bold text-white mb-2">กรุณาเข้าสู่ระบบ</h3>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              คุณต้องเข้าสู่ระบบสมาชิกก่อน<br />
              เพื่อร่วมแสดงความคิดเห็นหรือรีวิวการบริการ
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full py-4 bg-amber-500 text-black hover:bg-amber-400 rounded-2xl font-bold transition-all shadow-xl active:scale-95 shadow-amber-500/20"
              >
                เข้าสู่ระบบตอนนี้
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-4 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-2xl font-bold transition-all active:scale-95"
              >
                ไว้ทีหลัง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {deleteId && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
          <div className="relative bg-zinc-900 border border-white/10 p-8 rounded-4xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
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
      <section id="home" className="relative min-h-175 lg:min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" alt="Barbershop Background" className="w-full h-full object-cover scale-105 animate-[kenburns_20s_infinite_alternate]" />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-transparent"></div>
          {/* Decorative Glow */}
          <div className="absolute top-20 -right-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-350 mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center pt-12">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-12 duration-700">
            <div className="flex items-center gap-5 mb-8">
              <div className="h-0.75 w-16 bg-linear-to-r from-amber-500 to-amber-600 animate-pulse"></div>
              <span className="text-amber-500 uppercase tracking-[0.3em] text-base font-bold">Est. 2024 • Sakon Nakhon</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-bold text-white leading-[1.1] drop-shadow-2xl">
              Unleash Your <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-500 to-amber-700 italic pr-4">Best Look</span>
            </h1>
            <p className="text-zinc-300 text-xl md:text-2xl max-w-xl leading-relaxed font-light pl-8 border-l-4 border-amber-500 hover:border-amber-400 transition-colors">
              สัมผัสประสบการณ์การตัดผมระดับพรีเมียม ดูแลโดยช่างผู้เชี่ยวชาญ
            </p>
            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              <button onClick={() => navigate("/booking")} className="px-10 py-5 text-lg bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold tracking-widest transition-all rounded-lg shadow-[0_0_30px_rgba(245,158,11,0.4)] transform hover:-translate-y-1 active:scale-95">
                ดูบริการของเรา
              </button>
              <a href="#contact" className="px-10 py-5 text-lg border-2 border-amber-500/50 text-white font-bold tracking-widest hover:bg-amber-500/10 hover:border-amber-500 transition-all flex items-center justify-center gap-3 group rounded-lg">
                ติดต่อจองคิว Walk-in <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
          </div>
          <div className="hidden lg:block relative animate-in fade-in slide-in-from-right-12 duration-700 delay-200">
            <div className="relative rounded-3xl overflow-hidden border-4 border-amber-500/50 shadow-2xl shadow-amber-500/30 group">
              <img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop" alt="Barber working" className="w-full h-175 object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>
      {/* --- SERVICES SECTION --- */}
      <section id="services" className="py-32 md:py-40 bg-zinc-950 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -ml-40 -mt-40"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl -mr-48 -mb-48"></div>

        <div className="max-w-350 mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
            <Scissors size={18} className="text-amber-500" />
            <span className="text-amber-500 text-sm font-bold uppercase tracking-widest">Our Services</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-serif text-white mb-8">บริการระดับ Masterpiece</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-16">แต่ละบริการได้รับการออกแบบมาเพื่อให้คุณมีประสบการณ์ที่ดีที่สุด</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayServices.map((service, idx) => (
              <div key={idx} onClick={() => navigate("/booking")} className="group relative h-125 overflow-hidden border-2 border-white/10 hover:border-amber-500/50 cursor-pointer rounded-2xl transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/20 animate-in fade-in slide-in-from-bottom-4" style={{
                animationDelay: `${idx * 100}ms`
              }}>
                <img src={service.img_url} alt={service.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 saturate-75 group-hover:saturate-100" />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300 z-10">
                  <div className="flex justify-between items-end border-b border-amber-500/30 pb-6 mb-6">
                    <h3 className="text-2xl md:text-3xl font-serif text-white italic group-hover:text-amber-300 transition-colors">{service.name}</h3>
                    <span className="text-amber-400 font-bold text-2xl">{service.price}.-</span>
                  </div>
                  <p className="text-zinc-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PROMOTIONS SECTION (NEW) --- */}
      {promotions.length > 0 && (
        <section className="py-32 bg-linear-to-b from-zinc-950 to-zinc-900 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-20 right-10 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-600 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-350 mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-serif text-white mb-4">โปรโมชั่นพิเศษ</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">สิทธิ์พิเศษและส่วนลดเฉพาะสำหรับลูกค้าของเรา</p>
            </div>

            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              breakpoints={{
                768: { slidesPerView: 2 },
                1280: { slidesPerView: 3 }
              }}
              pagination={{ clickable: true }}
              className="pb-16"
            >
              {promotions.map((promo) => (
                <SwiperSlide key={promo.id}>
                  <div className="group relative h-125 rounded-[3rem] overflow-hidden border-2 border-amber-500/30 bg-zinc-900 shadow-2xl hover:shadow-amber-500/50 transition-all duration-500">
                    {/* Background Image */}
                    <img
                      src={promo.image_url || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop"}
                      alt={promo.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>

                    {/* Decorative Badge */}
                    <div className="absolute top-6 right-6 z-20">
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-500 rounded-full blur animate-pulse opacity-75"></div>
                        <div className="relative bg-amber-500 text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                          {promo.discount_text}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                      {/* Promo Badge */}
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold w-fit mb-4 backdrop-blur-sm">
                        <Star size={14} className="fill-amber-400" /> {promo.code}
                      </div>

                      {/* Title */}
                      <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 group-hover:text-amber-300 transition-colors duration-300 leading-tight">
                        {promo.title}
                      </h3>

                      {/* Description */}
                      {promo.description && (
                        <p className="text-zinc-300 mb-6 font-light leading-relaxed text-base line-clamp-2">
                          {promo.description}
                        </p>
                      )}

                      {/* Expiry Info */}
                      {promo.expire_date && (
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6">
                          <Calendar size={16} className="text-amber-500" />
                          <span>หมดเขต: {new Date(promo.expire_date).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}

                      {/* CTA Button */}
                      <button
                        onClick={() => navigate("/booking")}
                        className="w-full py-4 bg-linear-to-r from-amber-500 to-amber-600 text-black font-bold rounded-2xl hover:from-amber-400 hover:to-amber-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/50 flex items-center justify-center gap-2"
                      >
                        <span>รับสิทธิ์และจองคิว</span>
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>
      )}

      {/* --- REVIEWS SECTION --- */}
      <section id="reviews" className="py-32 md:py-40 relative overflow-hidden bg-linear-to-b from-zinc-950 to-black border-t border-amber-500/20">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-40 left-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-0 w-96 h-96 bg-amber-600 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-350 mx-auto px-6 relative z-10">
          <div className="text-center mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Star size={18} className="text-amber-500" />
              <span className="text-amber-500 text-sm font-bold uppercase tracking-widest">Customer Reviews</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif text-white">ลูกค้าพูดถึงเราว่า...</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">ความพึงพอใจจากลูกค้าของเราคือความสำเร็จที่ยิ่งใหญ่ที่สุด</p>
          </div>

          <div className="max-w-2xl mx-auto mb-16 bg-linear-to-b from-zinc-900/40 to-zinc-950/20 p-8 rounded-[2.5rem] border-2 border-amber-500/20 backdrop-blur-sm hover:border-amber-500/40 transition-all duration-500 shadow-2xl">
            <form onSubmit={handlePostComment}>
              <div className="flex flex-col items-center gap-6 mb-6">
                <div className="space-y-2 text-center">
                  <p className="text-zinc-400 uppercase tracking-widest text-xs font-bold">ให้คะแนนความพึงพอใจ</p>
                  <div className="flex gap-3 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setRating(star)} className="transition-all active:scale-75 hover:scale-125">
                        <Star key={star} size={36} className={`${star <= rating ? "fill-amber-400 text-amber-400 drop-shadow-lg drop-shadow-amber-400/50" : "text-zinc-600 hover:text-amber-200"
                          } transition-all duration-200`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="ร่วมแบ่งปันประสบการณ์ของคุณ..."
                  className="w-full bg-zinc-900/50 border-2 border-amber-500/20 focus:border-amber-500/60 rounded-3xl p-6 pr-20 text-white placeholder-zinc-600 focus:outline-none transition-all h-32 resize-none text-base font-light backdrop-blur-sm"
                />
                <button
                  type="submit"
                  disabled={commentLoading || !newComment.trim()}
                  className="absolute bottom-6 right-6 p-4 bg-linear-to-r from-amber-500 to-amber-600 text-black rounded-2xl hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/50"
                >
                  {commentLoading ? <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin"></div> : <Send size={24} />}
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            <button
              onClick={() => setFilterStar(0)}
              className={`px-6 py-2.5 rounded-full border-2 transition-all font-medium ${filterStar === 0
                ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/30"
                : "border-amber-500/20 text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/5"
                }`}
            >
              ทั้งหมด
            </button>
            {[5, 4, 3, 2, 1].map(s => (
              <button
                key={s}
                onClick={() => setFilterStar(s)}
                className={`px-6 py-2.5 rounded-full border-2 flex items-center gap-2 transition-all font-medium ${filterStar === s
                  ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/30"
                  : "border-amber-500/20 text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/5"
                  }`}
              >
                {s} <Star size={14} className={filterStar === s ? "fill-black" : "fill-amber-500"} />
              </button>
            ))}
          </div>

          <div className="relative group px-4">
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
                className="pb-20 overflow-visible!"
              >
                {filteredComments.map((comment) => (
                  <SwiperSlide key={comment.id}>
                    <div className="bg-linear-to-br from-zinc-900/60 to-zinc-950/40 backdrop-blur-md p-8 md:p-10 border-2 border-white/5 hover:border-amber-500/40 transition-all group rounded-3xl h-full flex flex-col min-h-350px shadow-2xl relative hover:shadow-amber-500/20 duration-500">
                      {currentUser && currentUser.id === comment.user_id && (
                        <button
                          onClick={() => setDeleteId(comment.id)}
                          className="absolute -top-3 -right-3 p-3 bg-linear-to-br from-red-600 to-red-700 text-white rounded-full shadow-lg hover:shadow-red-500/50 hover:scale-110 transition-all duration-300 z-40 border-2 border-zinc-950 hover:from-red-500 hover:to-red-600"
                          title="ลบรีวิวนี้"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      <MessageSquare size={60} className="absolute top-8 right-10 text-amber-500/10 pointer-events-none" />
                      <div className="flex gap-1 mb-8">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={16} className={j < (comment.rating || 5) ? "fill-amber-400 text-amber-400" : "text-zinc-700"} />
                        ))}
                      </div>
                      <p className="text-lg text-zinc-200 mb-10 leading-relaxed font-serif italic grow drop-shadow-lg">"{comment.content}"</p>
                      <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                        {comment.user_avatar ? (
                          <img src={comment.user_avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/30" alt="avatar" />
                        ) : (
                          <div className="w-12 h-12 bg-linear-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/30"><UserIcon size={20} /></div>
                        )}
                        <div className="grow">
                          <h4 className="text-white font-bold">{comment.user_name}</h4>
                          <span className="text-zinc-500 text-xs">{new Date(comment.created_at).toLocaleDateString('th-TH')}</span>
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
      <section id="contact" className="py-32 bg-linear-to-b from-zinc-900 to-black relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="max-w-350 mx-auto px-6 relative z-10">
          <div className="bg-linear-to-b from-zinc-900/50 to-zinc-950 rounded-3xl overflow-hidden border-2 border-amber-500/20 shadow-2xl hover:border-amber-500/40 transition-all duration-500">
            <div className="grid lg:grid-cols-2">
              <div className="p-12 md:p-16 lg:p-20 flex flex-col justify-center space-y-12">
                <div>
                  <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2 flex items-center gap-4">
                    <MapPin className="text-amber-500" size={40} /> หล่อเลย คัทซ์
                  </h2>
                  <p className="text-amber-500/60 text-sm font-bold uppercase tracking-widest">ร้านตัดผมชั้นนำแห่งสกลนคร</p>
                </div>
                <div className="space-y-8">
                  <div className="flex items-start gap-6 group hover:translate-x-2 transition-transform">
                    <div className="w-16 h-16 bg-linear-to-br from-amber-500/20 to-amber-600/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 group-hover:from-amber-500/40 transition-colors"><MapPin size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">ที่อยู่ร้าน</p>
                      <p className="text-lg text-white font-light leading-relaxed">เลขที่ 272/47 ถนนเทศบาลสงเคราะห์ <br /> อำเภอเมืองสกลนคร จังหวัดสกลนคร 47000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 group hover:translate-x-2 transition-transform">
                    <div className="w-16 h-16 bg-linear-to-br from-amber-500/20 to-amber-600/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 group-hover:from-amber-500/40 transition-colors"><Phone size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">สอบถาม</p>
                      <a href="tel:0922689270" className="text-3xl font-bold text-white hover:text-amber-400 transition-colors">092-268-9270</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 group hover:translate-x-2 transition-transform">
                    <div className="w-16 h-16 bg-linear-to-br from-amber-500/20 to-amber-600/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 group-hover:from-amber-500/40 transition-colors"><Clock size={28} /></div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">เวลาเปิด - ปิด</p>
                      <p className="text-white text-lg font-light">เปิดบริการทุกวัน <span className="text-amber-400 font-semibold ml-2">09:00 - 20:00 น.</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-500px lg:h-auto bg-zinc-800 relative w-full group overflow-hidden">
                <iframe
                  title="Google Map ร้านหล่อเลย"
                  src="https://maps.google.com/maps?q=ร้านหล่อเลย+272/47+ถนนเทศบาลสงเคราะห์+สกลนคร&t=&z=17&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  className="group-hover:brightness-110 transition-all duration-500"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}