import React, { useEffect, useState } from 'react';
import { Search, Mail, Phone, User, Edit2, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../supabase/client';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State สำหรับ Modal แก้ไขข้อมูลโปรไฟล์
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', phone: '', address: '' });

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, phone, address, avatar_url, updated_at');
        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // ฟังก์ชันเปิด Modal แก้ไข
  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      address: user.address || '',
    });
  };

  // ฟังก์ชันบันทึกข้อมูลโปรไฟล์
  const handleSaveProfile = async () => {
    if (!editingUser) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          address: formData.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id)
        .select()
        .single();
      if (error) throw error;
      setUsers(users.map(u => u.id === editingUser.id ? data : u));
      setEditingUser(null);
      alert('บันทึกข้อมูลเรียบร้อย');
    } catch (err) {
      alert('บันทึกข้อมูลไม่สำเร็จ: ' + err.message);
    }
  };

  // ฟังก์ชันลบผู้ใช้ (ลบแถว profiles เท่านั้น)
  const handleDeleteUser = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าจะลบผู้ใช้นี้ออกจากระบบ? (ไม่สามารถกู้คืนได้)")) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert('ลบผู้ใช้ไม่สำเร็จ: ' + err.message);
    }
  };

  // Filter Users
  const filteredUsers = users.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">จัดการสมาชิก</h1>
          <p className="text-zinc-400 text-sm">รายชื่อลูกค้า (ดึงจากตาราง profiles)</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-lg">
         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาสมาชิกด้วยชื่อ / เบอร์ / ที่อยู่..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-amber-500 outline-none transition-all"
            />
         </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                     <th className="px-6 py-4 font-medium">User</th>
                     <th className="px-6 py-4 font-medium">Contact</th>
                     <th className="px-6 py-4 font-medium">Address</th>
                     <th className="px-6 py-4 font-medium">Updated</th>
                     <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                  {loading ? (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-zinc-500">กำลังโหลด...</td></tr>
                  ) : filteredUsers.map((user) => (
                     <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 relative">
                                 {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-zinc-500"/>}
                              </div>
                              <div>
                                 <p className="font-bold text-white flex items-center gap-2">
                                     {user.full_name || 'ไม่ระบุชื่อ'}
                                 </p>
                                 <p className="text-xs text-zinc-500">ID: {user.id}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1 text-zinc-400">
                              <span className="flex items-center gap-2 text-xs"><Mail size={12}/> {user.email || 'N/A'}</span>
                              <span className="flex items-center gap-2 text-xs font-num"><Phone size={12}/> {user.phone || '-'}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">{user.address || '-'}</td>
                        <td className="px-6 py-4 font-num text-zinc-400">{user.updated_at ? new Date(user.updated_at).toLocaleString('th-TH') : '-'}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditClick(user)}
                                title="แก้ไขข้อมูล"
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                              >
                                  <Edit2 size={16}/>
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                title="ลบผู้ใช้"
                                className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                              >
                                  <Trash2 size={16}/>
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- Edit Profile Modal --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={20} className="text-amber-500"/> แก้ไขข้อมูลผู้ใช้
                    </h3>
                    <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">ชื่อ-สกุล</label>
                        <input 
                            type="text" 
                            value={formData.full_name}
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">เบอร์โทร</label>
                        <input 
                            type="text" 
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">ที่อยู่</label>
                        <textarea 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            rows="3"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={() => setEditingUser(null)}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleSaveProfile}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                        <Save size={18} /> บันทึก
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}