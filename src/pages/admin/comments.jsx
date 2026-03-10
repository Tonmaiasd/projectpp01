import React, { useState, useEffect } from "react";
import {
  Trash2,
  Star,
  MessageSquare,
  Filter,
  Search,
  BarChart3,
  User as UserIcon
} from "lucide-react";
import { supabase } from "../../supabase/client";

export default function AdminComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStar, setFilterStar] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (commentsData) => {
    if (commentsData.length === 0) {
      setStats({
        total: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      return;
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    commentsData.forEach(comment => {
      const rating = comment.rating || 5;
      distribution[rating]++;
      totalRating += rating;
    });

    setStats({
      total: commentsData.length,
      averageRating: (totalRating / commentsData.length).toFixed(1),
      ratingDistribution: distribution
    });
  };

  const handleDeleteComment = async (id) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) {
        console.error('Delete error details:', error);
        return;
      }

      fetchComments();
      setDeleteId(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const filteredComments = comments.filter(comment => {
    const matchesFilter = filterStar === 0 || comment.rating === filterStar;
    const matchesSearch =
      comment.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={32} className="text-amber-500" />
            <h1 className="text-4xl font-bold text-white font-serif">จัดการความเห็น</h1>
          </div>
          <p className="text-zinc-400">ดูแลและจัดการรีวิวจากลูกค้า</p>
        </div>

        {/* Statistics Section */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm font-bold uppercase">รวมทั้งหมด</p>
              <MessageSquare size={20} className="text-amber-500" />
            </div>
            <p className="text-4xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm font-bold uppercase">คะแนนเฉลี่ย</p>
              <Star size={20} className="text-amber-500 fill-amber-500" />
            </div>
            <p className="text-4xl font-bold text-white">{stats.averageRating}</p>
          </div>

          {[5, 4, 3].map(star => (
            <div key={star} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-400 text-sm font-bold uppercase">{star} ⭐</p>
              </div>
              <p className="text-4xl font-bold text-amber-500">{stats.ratingDistribution[star]}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.total > 0 ? ((stats.ratingDistribution[star] / stats.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          ))}
        </div>

        {/* Filter and Search */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Search Bar */}
            <div className="relative">
              <Search size={20} className="absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า หรือ เนื้อหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 outline-none transition-all"
              />
            </div>

            {/* Star Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={20} className="text-zinc-400" />
              <button
                onClick={() => setFilterStar(0)}
                className={`px-4 py-2 rounded-lg border transition-all ${filterStar === 0
                    ? 'bg-amber-500 text-black border-amber-500 font-bold'
                    : 'border-white/10 text-zinc-400 hover:border-white/30'
                  }`}
              >
                ทั้งหมด
              </button>
              {[5, 4, 3, 2, 1].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStar(s)}
                  className={`px-3 py-2 rounded-lg border transition-all flex items-center gap-1 ${filterStar === s
                      ? 'bg-amber-500 text-black border-amber-500 font-bold'
                      : 'border-white/10 text-zinc-400 hover:border-white/30'
                    }`}
                >
                  {s} <Star size={14} className={filterStar === s ? 'fill-black' : 'fill-zinc-400'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {filteredComments.length > 0 ? (
            filteredComments.map(comment => (
              <div
                key={comment.id}
                className="bg-zinc-900 border border-white/10 hover:border-amber-500/30 rounded-2xl p-6 transition-all group relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4 grow">
                    {comment.user_avatar ? (
                      <img
                        src={comment.user_avatar}
                        alt="avatar"
                        className="w-12 h-12 rounded-xl object-cover border border-amber-500/20"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-amber-500 border border-white/10">
                        <UserIcon size={20} />
                      </div>
                    )}
                    <div className="grow">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-bold text-lg">{comment.user_name}</h3>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < (comment.rating || 5)
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-zinc-700'
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {new Date(comment.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteId(comment.id)}
                    className="ml-4 shrink-0 p-3 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="ลบรีวิวนี้"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Comment Content */}
                <p className="text-zinc-300 leading-relaxed pl-16 text-base">
                  {comment.content}
                </p>
              </div>
            ))
          ) : (
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-lg">
                {searchQuery || filterStar > 0 ? 'ไม่พบรีวิวที่ตรงกัน' : 'ยังไม่มีรีวิวในขณะนี้'}
              </p>
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredComments.length > 0 && (
          <div className="mt-6 text-center text-zinc-500 text-sm">
            แสดง {filteredComments.length} จาก {stats.total} รีวิว
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          ></div>
          <div className="relative bg-zinc-900 border border-white/10 p-8 rounded-4xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 text-center">ยืนยันการลบ?</h3>
            <p className="text-zinc-400 text-center mb-8">
              รีวิวนี้จะถูกลบถาวรและไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDeleteComment(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all"
              >
                ลบทันที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
