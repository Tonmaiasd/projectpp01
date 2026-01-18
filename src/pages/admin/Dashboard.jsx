import React from 'react';
import { 
  Users, DollarSign, CalendarCheck, TrendingUp, 
  MoreHorizontal, CheckCircle, XCircle, Clock
} from 'lucide-react';

export default function Dashboard() {
  
  // Mockup Data
  const stats = [
    { title: "รายได้วันนี้", value: "฿4,500", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", trend: "+12% จากเมื่อวาน" },
    { title: "การจองทั้งหมด", value: "18", icon: CalendarCheck, color: "text-amber-500", bg: "bg-amber-500/10", trend: "รออนุมัติ 3 รายการ" },
    { title: "ลูกค้าใหม่", value: "5", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+2 คนในสัปดาห์นี้" },
    { title: "ช่างเข้างาน", value: "3/4", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", trend: "ลางาน 1 คน" },
  ];

  const recentBookings = [
    { id: "BK001", customer: "คุณสมชาย", service: "ตัดผมชายวินเทจ", time: "10:30", barber: "ช่างเอก", status: "Completed", price: "450" },
    { id: "BK002", customer: "คุณวิชัย", service: "โกนหนวด", time: "11:00", barber: "ช่างนนท์", status: "Pending", price: "350" },
    { id: "BK003", customer: "น้องเก่ง", service: "ตัดผมเด็ก", time: "13:00", barber: "ช่างเจมส์", status: "Confirmed", price: "300" },
    { id: "BK004", customer: "คุณอาทิตย์", service: "ดัดวอลลุ่ม", time: "14:30", barber: "ช่างเอก", status: "Cancelled", price: "1,500" },
  ];

  const getStatusBadge = (status) => {
      const styles = {
          Completed: "bg-green-500/10 text-green-500 border-green-500/20",
          Pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          Confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          Cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
      };
      return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.Pending}`}>
              {status}
          </span>
      );
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">ภาพรวมของร้านวันนี้ • {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-zinc-900 border border-white/5 p-6 rounded-2xl shadow-lg hover:border-amber-500/30 transition-all">
             <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                   <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {index === 0 && <span className="bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><TrendingUp size={10}/> +12%</span>}
             </div>
             <h3 className="text-zinc-400 text-sm font-medium mb-1">{stat.title}</h3>
             <p className="text-3xl font-bold font-num text-white mb-2">{stat.value}</p>
             <p className="text-xs text-zinc-500">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
         <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">รายการจองล่าสุด</h2>
            <button className="text-sm text-amber-500 hover:text-amber-400 font-medium transition-colors">ดูทั้งหมด &rarr;</button>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                  <tr>
                     <th className="px-6 py-4 font-medium">Booking ID</th>
                     <th className="px-6 py-4 font-medium">ลูกค้า</th>
                     <th className="px-6 py-4 font-medium">บริการ</th>
                     <th className="px-6 py-4 font-medium">ช่าง</th>
                     <th className="px-6 py-4 font-medium">เวลานัดหมาย</th>
                     <th className="px-6 py-4 font-medium">ยอดเงิน</th>
                     <th className="px-6 py-4 font-medium">สถานะ</th>
                     <th className="px-6 py-4 font-medium text-right">จัดการ</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-sm">
                  {recentBookings.map((booking) => (
                     <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-num text-zinc-500">#{booking.id}</td>
                        <td className="px-6 py-4 font-bold text-white">{booking.customer}</td>
                        <td className="px-6 py-4 text-zinc-300">{booking.service}</td>
                        <td className="px-6 py-4 text-zinc-300">{booking.barber}</td>
                        <td className="px-6 py-4 font-num text-zinc-300 flex items-center gap-2">
                           <Clock size={14} className="text-amber-500"/> {booking.time}
                        </td>
                        <td className="px-6 py-4 font-num text-white font-bold">฿{booking.price}</td>
                        <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                        <td className="px-6 py-4 text-right">
                           <button className="text-zinc-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                              <MoreHorizontal size={18} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}