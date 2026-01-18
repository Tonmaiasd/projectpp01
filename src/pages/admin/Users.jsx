import React, { useState } from 'react';
import { Search, Mail, Phone, MoreVertical, Shield, User, Ban, CheckCircle, Edit2, Trash2, X, Save } from 'lucide-react';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // State สำหรับจัดการข้อมูลผู้ใช้
  const [users, setUsers] = useState([
    { id: 1, name: "คุณลูกค้า สุดหล่อ", email: "customer@example.com", phone: "099-123-4567", role: "Member", status: "Active", joined: "2024-01-15", avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop" },
    { id: 2, name: "สมศรี มีตังค์", email: "somsri@test.com", phone: "081-987-6543", role: "VIP", status: "Active", joined: "2024-02-20", avatar: null },
    { id: 3, name: "John Doe", email: "john@doe.com", phone: "090-000-0000", role: "Member", status: "Blocked", joined: "2024-03-10", avatar: null },
  ]);

  // State สำหรับ Modal แก้ไข Role
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  // --- Handlers ---

  // 1. ฟังก์ชันแบน/ปลดแบน
  const handleToggleBlock = (id) => {
    setUsers(users.map(user => {
      if (user.id === id) {
        const newStatus = user.status === "Active" ? "Blocked" : "Active";
        // แจ้งเตือน (Optional)
        // alert(`User ${user.name} is now ${newStatus}`);
        return { ...user, status: newStatus };
      }
      return user;
    }));
  };

  // 2. ฟังก์ชันเปิด Modal แก้ไข Role
  const handleEditRoleClick = (user) => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  // 3. ฟังก์ชันบันทึก Role ใหม่
  const handleSaveRole = () => {
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id ? { ...u, role: selectedRole } : u
      ));
      setEditingUser(null); // ปิด Modal
    }
  };

  // 4. ฟังก์ชันลบผู้ใช้
  const handleDeleteUser = (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าจะลบผู้ใช้นี้ออกจากระบบ? (ไม่สามารถกู้คืนได้)")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  // Filter Users
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">จัดการสมาชิก</h1>
          <p className="text-zinc-400 text-sm">รายชื่อลูกค้าและสถานะบัญชี</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-900 p-4 rounded-2xl border border-white/5 shadow-lg">
         <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาสมาชิกด้วย ชื่อ, อีเมล หรือ เบอร์โทร..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-amber-500 outline-none transition-all"
            />
         </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <tr>
                     <th className="px-6 py-4 font-medium">User</th>
                     <th className="px-6 py-4 font-medium">Contact</th>
                     <th className="px-6 py-4 font-medium">Role</th>
                     <th className="px-6 py-4 font-medium">Status</th>
                     <th className="px-6 py-4 font-medium">Joined Date</th>
                     <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                  {filteredUsers.map((user) => (
                     <tr key={user.id} className={`hover:bg-white/5 transition-colors group ${user.status === 'Blocked' ? 'opacity-60 bg-red-900/5' : ''}`}>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 relative">
                                 {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-zinc-500"/>}
                                 {user.status === 'Blocked' && (
                                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                         <Ban size={16} className="text-red-500"/>
                                     </div>
                                 )}
                              </div>
                              <div>
                                 <p className="font-bold text-white flex items-center gap-2">
                                     {user.name}
                                     {user.status === 'Blocked' && <span className="text-[10px] text-red-500 font-bold border border-red-500 px-1 rounded">BLOCKED</span>}
                                 </p>
                                 <p className="text-xs text-zinc-500">ID: {user.id}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1 text-zinc-400">
                              <span className="flex items-center gap-2 text-xs"><Mail size={12}/> {user.email}</span>
                              <span className="flex items-center gap-2 text-xs font-num"><Phone size={12}/> {user.phone}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center w-fit gap-1 ${
                               user.role === 'VIP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                               user.role === 'Admin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                               'bg-zinc-800 text-zinc-400 border-zinc-700'
                           }`}>
                              {user.role === 'VIP' && <Shield size={10}/>} {user.role}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${user.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                                <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                {user.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 font-num text-zinc-400">{user.joined}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Edit Role Button */}
                              <button 
                                onClick={() => handleEditRoleClick(user)}
                                title="แก้ไข Role"
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                              >
                                  <Edit2 size={16}/>
                              </button>

                              {/* Block/Unblock Button */}
                              <button 
                                onClick={() => handleToggleBlock(user.id)}
                                title={user.status === 'Active' ? "แบนผู้ใช้" : "ปลดแบน"}
                                className={`p-1.5 rounded transition-colors ${
                                    user.status === 'Active' 
                                    ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black' 
                                    : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'
                                }`}
                              >
                                  {user.status === 'Active' ? <Ban size={16}/> : <CheckCircle size={16}/>}
                              </button>

                              {/* Delete Button */}
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

      {/* --- Edit Role Modal --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 animate-[slideUp_0.3s_ease-out]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield size={20} className="text-amber-500"/> เปลี่ยนสถานะผู้ใช้
                    </h3>
                    <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800 overflow-hidden border-2 border-white/10 mb-3">
                        {editingUser.avatar ? <img src={editingUser.avatar} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-zinc-500"/>}
                    </div>
                    <h4 className="font-bold text-white text-lg">{editingUser.name}</h4>
                    <p className="text-zinc-500 text-sm">{editingUser.email}</p>
                </div>

                <div className="space-y-3 mb-6">
                    <label className="text-sm text-zinc-400 block mb-1">เลือก Role ใหม่:</label>
                    {['Member', 'VIP', 'Admin'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${
                                selectedRole === role 
                                ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                                : 'bg-zinc-950 border-white/10 text-zinc-400 hover:bg-zinc-800'
                            }`}
                        >
                            <span className="font-bold">{role}</span>
                            {selectedRole === role && <CheckCircle size={18} />}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setEditingUser(null)}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleSaveRole}
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