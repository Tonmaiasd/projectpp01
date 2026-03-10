import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv'; // Import dotenv
import { createClient } from '@supabase/supabase-js'; // Added missing import
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: อนุญาต Vercel frontend และ localhost ตอน dev
const allowedOrigins = [
  process.env.FRONTEND_URL,          // e.g. https://your-app.vercel.app
  'http://localhost:8888',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean); // ลบ undefined ออก

app.use(cors({
  origin: (origin, callback) => {
    // อนุญาต request ที่ไม่มี origin (เช่น Postman, cURL, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
      return callback(null, true);
    }
    // Fallback: Vercel preview URLs (**-*.vercel.app)
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
        return callback(null, true);
      }
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS: ${origin} not allowed`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

io.on('connection', (socket) => {
  console.log('📡 Socket.io: User connected', socket.id);

  // Listen for update events from any client (e.g., User Booking page)
  socket.on('bookingUpdate', () => {
    console.log('🔄 Socket.io: Received bookingUpdate from client, broadcasting...');
    notifyBookingUpdate(); // Broadcast to everyone
  });

  socket.on('servicesUpdate', () => {
    console.log('🔄 Socket.io: Received servicesUpdate from client, broadcasting...');
    notifyServicesUpdate(); // Broadcast to everyone
  });

  socket.on('disconnect', () => {
    console.log('📡 Socket.io: User disconnected');
  });
});

// Helper to notify all clients to refresh bookings
const notifyBookingUpdate = () => {
  console.log('📢 Socket.io: Emitting bookingUpdate');
  io.emit('bookingUpdate');
};

// Helper to notify all clients to refresh services
const notifyServicesUpdate = () => {
  console.log('📢 Socket.io: Emitting servicesUpdate');
  io.emit('servicesUpdate');
};

// --- AUTO NOTIFICATION TRACKING ---
const notifiedBookings = new Set();

// --- Error Handling for Stability ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// LINE Messaging API config
// ต้องสร้าง Channel และเอา Channel access token มาใส่
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// กรณีง่ายสุด: ส่งไป userId หรือ groupId เดียวที่กำหนดไว้ล่วงหน้า
// (กดดู userId ได้จาก webhook / หรือใช้ LINE Developers tools อื่น ๆ)
const LINE_DEFAULT_TO = process.env.LINE_DEFAULT_TO; // userId หรือ groupId

const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push';

app.post('/api/line/notify', async (req, res) => {
  const { booking_id, customer_name, service_name, booking_date, booking_time, price } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. หา user_id จาก booking
    const { data: booking, error: bError } = await supabaseAdmin
      .from('bookings')
      .select('user_id')
      .eq('id', booking_id)
      .single();

    if (bError || !booking?.user_id) {
      console.log('No user_id found for this booking (Walk-in)');
      return res.status(200).json({ status: 'No user linked' });
    }

    // 2. หา line_user_id จาก profiles
    const { data: profile, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('line_user_id')
      .eq('id', booking.user_id)
      .single();

    if (pError || !profile?.line_user_id) {
      console.log('User has no line_user_id linked');
      return res.status(200).json({ status: 'No LINE ID linked' });
    }

    // 3. ส่ง Push Message แจ้งเตือนการจองสำเร็จ
    const message = {
      to: profile.line_user_id,
      messages: [
        {
          type: 'text',
          text: `🔔 ยืนยันการจองคิวสำเร็จ!\nร้าน: Lor Loei Cuts\n\nคุณ: ${customer_name}\nบริการ: ${service_name}\nวันที่: ${booking_date}\nเวลา: ${booking_time} น.\nราคา: ฿${price}\n\nขอบคุณที่ใช้บริการครับ 🙏`
        }
      ]
    };

    await axios.post(LINE_PUSH_API, message, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    res.json({ success: true, message: 'Notification sent' });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/line/notify:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Endpoint สำหรับแจ้งเตือนคิวที่ระบุ (เรียกโดย Admin จากปุ่มในแถวรายการ)
app.post('/api/notify-booking', async (req, res) => {
  console.log('📬 Received request to /api/notify-booking');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { booking_id } = req.body;

  if (!booking_id) return res.status(400).json({ error: 'Missing booking_id' });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Convert to number if it's a numeric string
    const finalId = !isNaN(Number(booking_id)) ? Number(booking_id) : booking_id;

    console.log(`🔍 Notifying specific booking ID #${finalId}...`);
    const { data: booking, error: bError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', finalId)
      .single();

    if (bError || !booking) {
      return res.status(404).json({ error: 'ไม่พบรายการจองที่ระบุ' });
    }

    // Reuse notification logic
    await sendLineNotification(supabaseAdmin, booking);

    res.json({
      success: true,
      message: `แจ้งเตือนคุณ ${booking.customer_name} (#${booking.id}) เรียบร้อยแล้ว`,
      booking_id: booking.id,
      customer_name: booking.customer_name
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to notify: ' + err.message });
  }
});

// Endpoint สำหรับแจ้งเตือนคิวถัดไป (เรียกโดย Admin ปุ่มด้านบน)
app.post('/api/next-queue', async (req, res) => {
  console.log('📬 Received request to /api/next-queue (Find Next)');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Searching for the next upcoming booking...');
    const { data: nextBooking, error: bError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .in('status', ['Pending'])
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
      .limit(1)
      .single();

    if (bError || !nextBooking) {
      return res.status(404).json({ error: 'ไม่พบรายการจองใหม่ที่รอการแจ้งเตือน' });
    }

    await sendLineNotification(supabaseAdmin, nextBooking);

    res.json({
      success: true,
      message: `แจ้งเตือนคิวถัดไป: คุณ ${nextBooking.customer_name} (#${nextBooking.id}) เรียบร้อยแล้ว`,
      booking_id: nextBooking.id,
      customer_name: nextBooking.customer_name
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to notify next queue: ' + err.message });
  }
});

// Endpoint: ยกเลิกคิวตามช่วงเวลา (Busy Time Range)
app.post('/api/cancel-time-range-bookings', async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required parameters (date, startTime, endTime)' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. ค้นหารายการ Pending ในช่วงเวลาดังกล่าว
    const { data: bookings, error: fError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .eq('status', 'Pending')
      .gte('booking_time', startTime)
      .lte('booking_time', endTime);

    if (fError) throw fError;

    // 2. บันทึกช่วงเวลาไม่ว่างลงในตาราง admin_busy_times (ทำเสมอแม้ไม่มีคิว)
    const { error: iError } = await supabaseAdmin
      .from('admin_busy_times')
      .insert([{
        busy_date: date,
        start_time: startTime,
        end_time: endTime,
        is_full_day: false
      }]);

    if (iError) {
      console.error('Failed to record busy time:', iError.message);
      return res.status(500).json({ error: 'ไม่สามารถบันทึกเวลาไม่ว่างได้ (ตรวจสอบว่าสร้างตาราง admin_busy_times หรือยัง): ' + iError.message });
    }

    if (!bookings || bookings.length === 0) {
      return res.json({ success: true, message: 'ประกาศไม่ว่างเรียบร้อยแล้ว (ไม่มีคิวที่ถูกยกเลิก)', count: 0 });
    }

    // 3. ยกเลิกและแจ้งเตือนทีละรายการ
    const customMsg = `ขออภัยครับ แอดมินไม่สะดวกในช่วงเวลาที่คุณจองไว้ (${startTime.slice(0, 5)} - ${endTime.slice(0, 5)} น.) เนื่องจากติดธุระด่วน จึงขออนุญาตยกเลิกคิว และรบกวนคุณจองเข้ามาใหม่ในเวลาอื่นครับ 🙏`;

    let successCount = 0;
    for (const b of bookings) {
      const { error: uError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', b.id);

      if (!uError) {
        try {
          await sendLineNotification(supabaseAdmin, b, customMsg);
          successCount++;
        } catch (err) {
          console.warn(`Failed to notify booking #${b.id}:`, err.message);
        }
      }
    }

    res.json({ success: true, message: `ยกเลิกและแจ้งเตือนเรียบร้อยแล้ว ${successCount} รายการ`, count: successCount });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/cancel-time-range-bookings:', err.message);
    res.status(500).json({ error: 'Failed to process cancellation: ' + err.message });
  }
});

// Endpoint: ยกเลิกคิวทั้งวัน (Full Day / Shop Closed)
app.post('/api/cancel-full-day-bookings', async (req, res) => {
  const { date } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!date) return res.status(400).json({ error: 'Missing date' });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. ดึงคิวที่เป็น Pending ของวันที่เลือกออกมา
    const { data: bookings, error: fError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .eq('status', 'Pending');

    if (fError) throw fError;

    // 2. บันทึกการหยุดร้านทั้งวันลงในตาราง admin_busy_times
    const { error: iError } = await supabaseAdmin
      .from('admin_busy_times')
      .insert([{
        busy_date: date,
        start_time: '09:00',
        end_time: '20:00',
        is_full_day: true
      }]);

    if (iError) {
      console.error('Failed to record full day busy time:', iError.message);
      return res.status(500).json({ error: 'ไม่สามารถบันทึกเวลาหยุดร้านได้: ' + iError.message });
    }

    // --- ส่วนการจัดการข้อความแจ้งเตือน ---

    // แปลงวันที่จาก 2026-01-30 เป็น "30 มกราคม 2569"
    const formattedDate = new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (!bookings || bookings.length === 0) {
      return res.json({ success: true, message: `ประกาศหยุดร้านวันที่ ${formattedDate} เรียบร้อยแล้ว (ไม่มีคิวที่ถูกยกเลิก)`, count: 0 });
    }

    // กำหนดข้อความใหม่โดยใช้ formattedDate
    const customMsg = `ขออภัยครับ ในวันที่ ${formattedDate} ร้านมีความจำเป็นต้องปิดทำการหรือติดธุระทั้งวัน จึงขออนุญาตยกเลิกคิวของคุณ และรบกวนจองเข้ามาใหม่ในวันอื่นที่สะดวกครับ 🙏`;

    let successCount = 0;
    for (const b of bookings) {
      // อัปเดตสถานะเป็น Cancelled
      const { error: uError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', b.id);

      if (!uError) {
        try {
          // ส่ง LINE แจ้งเตือนลูกค้า
          await sendLineNotification(supabaseAdmin, b, customMsg);
          successCount++;
        } catch (err) {
          console.warn(`Failed to notify booking #${b.id}:`, err.message);
        }
      }
    }

    res.json({
      success: true,
      message: `ยกเลิกคิววันที่ ${formattedDate} และแจ้งเตือนเรียบร้อยแล้ว ${successCount} รายการ`,
      count: successCount
    });
    notifyBookingUpdate();

  } catch (err) {
    console.error('Error in /api/cancel-full-day-bookings:', err.message);
    res.status(500).json({ error: 'Failed to process cancellation: ' + err.message });
  }
});

// Endpoint: ยกเลิกคิวหลายวัน (Multi-day Closure)
app.post('/api/cancel-multi-day-bookings', async (req, res) => {
  const { startDate, endDate } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // สร้าง Array ของวันที่ในช่วงนั้น
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    let current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    if (dates.length > 31) {
      return res.status(400).json({ error: 'ไม่อนุญาตให้ปิดร้านเกิน 31 วันในครั้งเดียว' });
    }

    const customMsg = `ขออภัยครับ ในช่วงวันที่คุณจองไว้ร้านปิดหรือแอดมินติดธุระ จึงขออนุญาตยกเลิกคิวของคุณ และรบกวนจองเข้ามาใหม่ในภายหลังครับ 🙏`;
    let totalCancelled = 0;

    for (const date of dates) {
      // 1. ค้นหาคิว Pending ในแต่ละวัน
      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('booking_date', date)
        .eq('status', 'Pending');

      // 2. บันทึกการหยุดร้านลง admin_busy_times
      const { error: iError } = await supabaseAdmin
        .from('admin_busy_times')
        .insert([{
          busy_date: date,
          start_time: '09:00',
          end_time: '20:00',
          is_full_day: true
        }]);

      if (iError) {
        console.error(`Failed to record busy time for ${date}:`, iError.message);
        throw new Error(`ไม่สามารถบันทึกวันหยุดสำหรับวันที่ ${date} ได้`);
      }

      // 3. ยกเลิกคิวและแจ้งเตือน
      if (bookings && bookings.length > 0) {
        for (const b of bookings) {
          const { error: uError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'Cancelled' })
            .eq('id', b.id);

          if (!uError) {
            try {
              await sendLineNotification(supabaseAdmin, b, customMsg);
              totalCancelled++;
            } catch (err) {
              console.warn(`Failed to notify booking #${b.id}:`, err.message);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: `บันทึกวันหยุดเรียบร้อยแล้ว (${dates.length} วัน) และยกเลิกคิวรวม ${totalCancelled} รายการ`,
      count: totalCancelled
    });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/cancel-multi-day-bookings:', err.message);
    res.status(500).json({ error: 'Failed to process multi-day cancellation: ' + err.message });
  }
});

// Endpoint: ลบวันหยุด/เวลาไม่ว่าง
app.post('/api/delete-holiday', async (req, res) => {
  const { id } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!id) return res.status(400).json({ error: 'Missing holiday ID' });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let query = supabaseAdmin.from('admin_busy_times').delete();

    if (Array.isArray(id)) {
      query = query.in('id', id);
    } else {
      query = query.eq('id', id);
    }

    const { error } = await query;

    if (error) throw error;
    res.json({ success: true, message: 'ลบรายการเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error in /api/delete-holiday:', err.message);
    res.status(500).json({ error: 'Failed to delete holiday: ' + err.message });
  }
});

// Endpoint: เลื่อนคิวจองและแจ้งเตือน LINE (Client Request)
app.post('/api/reschedule-booking', async (req, res) => {
  const { bookingId, newDate, newTime, oldDate, oldTime, serviceName } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId || !newDate || !newTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 0. Check Reschedule Count
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('reschedule_count')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    const currentCount = existingBooking.reschedule_count || 0;
    if (currentCount >= 2) {
      return res.status(400).json({ error: 'คุณได้ใช้สิทธิ์เลื่อนการจองครบ 2 ครั้งแล้ว ไม่สามารถดำเนินการต่อได้' });
    }

    // 1. Update Booking
    const { data: booking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        reschedule_count: currentCount + 1
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Send LINE Notification
    const formattedOldDate = new Date(oldDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const formattedNewDate = new Date(newDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

    const msg = `🔄 แจ้งเตือนการเลื่อนคิวจองครับ\n\nบริการ: ${serviceName}\n\n📅 เลื่อนจาก: ${formattedOldDate} (${oldTime.slice(0, 5)} น.)\n➡️ ไปเป็น: ${formattedNewDate} (${newTime.slice(0, 5)} น.)\n\nระบบได้อัปเดตเวลาให้เรียบร้อยแล้วครับ ขอบคุณครับ ✨`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: 'เลื่อนคิวจองและแจ้งเตือนเรียบร้อยแล้ว' });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/reschedule-booking:', err.message);
    res.status(500).json({ error: 'Failed to reschedule booking: ' + err.message });
  }
});

// Endpoint: เลื่อนคิวโดย ADMIN (Admin Reschedule)
app.post('/api/admin-reschedule-booking', async (req, res) => {
  const { bookingId, newDate, newTime, oldDate, oldTime, serviceName } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId || !newDate || !newTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Update Booking (เลื่อนวัน/เวลาเท่านั้น ไม่แตะต้องสถานะ)
    const { data: booking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Send LINE Notification (ข้อความสำหรับ Admin เป็นคนเลื่อน)
    const formattedOldDate = new Date(oldDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const formattedNewDate = new Date(newDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

    // ข้อความที่ระบุว่า Admin เป็นคนเลื่อน
    const msg = `📢 แจ้งเตือนจากทางร้าน: เลื่อนคิวการจองครับ\n\nบริการ: ${serviceName}\n\n📅 เดิม: ${formattedOldDate} (${oldTime.slice(0, 5)} น.)\n➡️ ใหม่: ${formattedNewDate} (${newTime.slice(0, 5)} น.)\n\n(ดำเนินการโดย Admin) หากลูกค้าไม่สะดวกในเวลาใหม่ กรุณาติดต่อร้านค้าครับ 🙏`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: 'Admin เลื่อนคิวและแจ้งเตือนเรียบร้อยแล้ว' });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/admin-reschedule-booking:', err.message);
    res.status(500).json({ error: 'Failed to reschedule booking: ' + err.message });
  }
});

// Endpoint: ยกเลิกการจองและแจ้งเตือน LINE
app.post('/api/cancel-booking', async (req, res) => {
  const { bookingId, customerName, serviceName, bookingDate, bookingTime } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId) {
    return res.status(400).json({ error: 'Missing bookingId' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Update status to Cancelled
    const { data: booking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Send LINE Notification
    const formattedDate = new Date(bookingDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const msg = `❌ แจ้งเตือนการยกเลิกคิวจองครับ\n\nคุณ ${customerName} ได้ยกเลิกการจอง:\n🔹 บริการ: ${serviceName}\n📅 วันที่: ${formattedDate}\n⏰ เวลา: ${bookingTime.slice(0, 5)} น.\n\nระบบได้ดำเนินการยกเลิกคิวให้เรียบร้อยแล้วครับ ✨`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: 'ยกเลิกการจองเรียบร้อยแล้ว' });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/cancel-booking:', err.message);
    res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
  }
});

// Endpoint: Admin ยกเลิกคิวเนื่องจากลูกค้าไม่มาใช้บริการ + แจ้งเตือน LINE
app.post('/api/admin-cancel-no-show', async (req, res) => {
  const { bookingId } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId) {
    return res.status(400).json({ error: 'Missing bookingId' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. ดึงข้อมูล booking ก่อน
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'ไม่พบรายการจองที่ระบุ' });
    }

    // 2. Update status to Cancelled
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 3. ส่ง LINE แจ้งเตือน (ข้อความเฉพาะ: ไม่มาใช้บริการ)
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const msg = `❌ แจ้งเตือนจากทางร้าน Lor Loei Cuts ครับ\n\nเราได้ยกเลิกคิวของคุณ ${booking.customer_name} แล้ว\n🔹 บริการ: ${booking.service_name}\n📅 วันที่: ${formattedDate}\n⏰ เวลา: ${booking.booking_time.slice(0, 5)} น.\n\nเนื่องจากคุณไม่มาใช้บริการของเราในเวลาที่กำหนด หากต้องการจองใหม่ กรุณาติดต่อหรือจองผ่านแอปได้เลยครับ 🙏`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: `ยกเลิกคิวและแจ้งเตือนคุณ ${booking.customer_name} เรียบร้อยแล้ว` });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/admin-cancel-no-show:', err.message);
    res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
  }
});

// Endpoint: ผู้ใช้แก้ไขรายการจอง (เฉพาะทรงผมและโปรโมชั่น) และแจ้งเตือน LINE
app.post('/api/user-update-booking', async (req, res) => {
  const { bookingId, serviceName, price, appliedPromo } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId || !serviceName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 0. Check Update Count
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('update_count')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    const currentCount = existingBooking.update_count || 0;
    if (currentCount >= 2) {
      return res.status(400).json({ error: 'คุณได้ใช้สิทธิ์แก้ไขชื่อทรงผมครบ 2 ครั้งแล้ว ไม่สามารถดำเนินการต่อได้' });
    }

    // 1. Update Booking
    const { data: booking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        service_name: serviceName,
        price: price,
        applied_promo: appliedPromo || null,
        update_count: currentCount + 1
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Send LINE Notification
    const msg = `✍️ แจ้งเตือนการแก้ไขรายการจองครับ\n\nคุณ ${booking.customer_name} ได้แก้ไขรายละเอียด:\n🔹 ทรงผมใหม่: ${serviceName}\n💰 ราคาใหม่: ฿${price}\n🎟️ โปรโมชั่น: ${appliedPromo || '-'}\n\nระบบอัปเดตข้อมูลให้เรียบร้อยแล้วครับ ✨`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: 'แก้ไขข้อมูลการจองและแจ้งเตือนเรียบร้อยแล้ว' });
    notifyBookingUpdate();
  } catch (err) {
    console.error('Error in /api/user-update-booking:', err.message);
    res.status(500).json({ error: 'Failed to update booking: ' + err.message });
  }
});

// --- HELPER FUNCTION FOR LINE NOTIFICATION ---
async function sendLineNotification(supabaseAdmin, booking, customMessage = null) {
  let lineUserId = null;
  if (booking.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('line_user_id')
      .eq('id', booking.user_id)
      .single();
    lineUserId = profile?.line_user_id;
  }

  if (!lineUserId) {
    console.log(`User ${booking.user_id} has no line_user_id`);
    return; // Don't throw, just skip
  }

  const defaultMsg = `📢 คุณ ${booking.customer_name} ครับ\nใกล้ถึงคิวของคุณแล้วสำหรับการบริการ: ${booking.service_name}\nเวลา: ${booking.booking_time.slice(0, 5)} น.\n\nกรุณาเตรียมตัวเดินทางมาใช้บริการที่ร้าน Lor Loei Cuts ภายใน 15 นาทีได้เลยครับ ✨`;

  const message = {
    to: lineUserId,
    messages: [
      {
        type: 'text',
        text: customMessage || defaultMsg
      }
    ]
  };

  await axios.post(LINE_PUSH_API, message, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    }
  });

  // Mark as notified
  notifiedBookings.add(booking.id);
  console.log(`✅ Notification sent to ${booking.customer_name} (#${booking.id})`);
}

// New endpoint to link Line ID to Supabase profile
app.post('/api/link-line-id', async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or Service Role Key is not set in environment variables.' });
  }

  const { supabaseUserId, lineUserId } = req.body;

  if (!supabaseUserId || !lineUserId) {
    return res.status(400).json({ error: 'supabaseUserId and lineUserId are required.' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); // Create an admin client

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ line_user_id: lineUserId })
      .eq('id', supabaseUserId);

    if (error) {
      console.error('Error updating profile line_user_id:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'LINE ID linked successfully.' });
  } catch (err) {
    console.error('Error in /api/link-line-id:', err.message);
    res.status(500).json({ error: 'Failed to link LINE ID.' });
  }
});

// Webhook สำหรับรับ event จาก LINE (ใช้ตอนทดสอบผ่าน ngrok)
app.post('/webhook', (req, res) => {
  const events = req.body.events || [];

  // log event เบื้องต้นเพื่อดูโครงสร้าง และดึง userId มาใช้
  events.forEach((event) => {
    console.log('Received event from LINE:', JSON.stringify(event, null, 2));
    if (event.source && event.source.userId) {
      console.log('LINE userId:', event.source.userId);
    }
  });

  // ต้องตอบ 200 กลับไปให้ LINE เสมอ
  res.status(200).json({ status: 'ok' });
});

// Endpoint: User แก้ไขข้อมูลตัวเอง (เปลี่ยนเบอร์โทร Login)
app.post('/api/user-update-profile', async (req, res) => {
  const { userId, phone, full_name, address } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!userId || !phone) {
    return res.status(400).json({ error: 'Missing userId or phone' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. ตรวจสอบว่าเบอร์ใหม่ซ้ำหรือไม่ (ใน profiles)
    const { data: existing, error: existError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'เบอร์โทรนี้ถูกใช้งานแล้วโดยผู้ใช้รายอื่น' });
    }

    // 2. อัปเดตข้อมูลใน Auth User (เปลี่ยน Email และ Metadata)
    const newEmail = `${phone}@phone.local`;

    // update email and metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: newEmail,
        user_metadata: {
          name: full_name,
          phone: phone
        }
      }
    );

    if (authError) {
      console.error('Error updating auth user:', authError);
      return res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลการล็อกอินได้: ' + authError.message });
    }

    // 3. อัปเดตข้อมูลในตาราง Profiles (public schema)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || null,
        phone: phone || null,
        address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'อัปเดตข้อมูล Login สำเร็จ แต่ข้อมูลส่วนตัวไม่บันทึก: ' + profileError.message });
    }

    res.json({ success: true, message: 'บันทึกข้อมูลและเบอร์โทรเข้าระบบเรียบร้อยแล้ว', data: profileData });

  } catch (err) {
    console.error('Error in /api/user-update-profile:', err.message);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

// Endpoint: Admin แก้ไขข้อมูล User (เปลี่ยนเบอร์โทร Login)
app.post('/api/admin-update-user', async (req, res) => {
  const { userId, phone, full_name, address } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!userId || !phone) {
    return res.status(400).json({ error: 'Missing userId or phone' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 0. ดึงข้อมูลเดิมก่อนเพื่อเช็คว่ามีการเปลี่ยนเบอร์หรือไม่
    const { data: oldProfile, error: oldProfileError } = await supabaseAdmin
      .from('profiles')
      .select('phone, full_name, line_user_id')
      .eq('id', userId)
      .single();

    if (oldProfileError) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const phoneChanged = oldProfile.phone !== phone;

    // 1. ตรวจสอบว่าเบอร์ใหม่ซ้ำหรือไม่ (ใน profiles)
    const { data: existing, error: existError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'เบอร์โทรนี้ถูกใช้งานแล้วโดยผู้ใช้รายอื่น' });
    }

    // 2. อัปเดตข้อมูลใน Auth User (เปลี่ยน Email)
    // Format email ใหม่: phone@phone.local
    const newEmail = `${phone}@phone.local`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (authError) {
      console.error('Error updating auth user:', authError);
      return res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลการล็อกอินได้: ' + authError.message });
    }

    // 3. อัปเดตข้อมูลในตาราง Profiles (public schema)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || null,
        phone: phone || null,
        address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'อัปเดตข้อมูล Login สำเร็จ แต่ข้อมูลส่วนตัวไม่บันทึก: ' + profileError.message });
    }

    // 4. ส่งการแจ้งเตือนไปยัง LINE ถ้ามีการเปลี่ยนเบอร์และมี line_user_id
    if (phoneChanged && oldProfile.line_user_id && LINE_CHANNEL_ACCESS_TOKEN) {
      try {
        const userName = full_name || oldProfile.full_name || 'คุณลูกค้า';
        const message = {
          to: oldProfile.line_user_id,
          messages: [
            {
              type: 'text',
              text: `🔔 แจ้งเตือนจากแอดมิน\n\n` +
                `สวัสดีครับคุณ ${userName} 👋\n\n` +
                `แอดมินได้ทำการแก้ไขเบอร์โทรศัพท์ของคุณเป็น:\n` +
                `📱 ${phone}\n\n` +
                `⚠️ สำคัญ: กรุณาใช้เบอร์โทรศัพท์ใหม่นี้ในการ Login ครั้งถัดไปครับ\n\n` +
                `ขอบคุณที่ใช้บริการ Lor Loei Cuts 🙏`
            }
          ]
        };

        await axios.post(LINE_PUSH_API, message, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          }
        });

        console.log(`✅ Sent phone change notification to LINE user: ${oldProfile.line_user_id}`);
      } catch (lineError) {
        console.error('❌ Failed to send LINE notification:', lineError.message);
        // ไม่ให้ error ของ LINE ขัดขวางการอัปเดตข้อมูล
      }
    }

    res.json({
      success: true,
      message: 'บันทึกข้อมูลและเบอร์โทรเข้าระบบเรียบร้อยแล้ว' + (phoneChanged ? ' และส่งการแจ้งเตือนไปยัง LINE แล้ว' : ''),
      data: profileData,
      phoneChanged: phoneChanged
    });

  } catch (err) {
    console.error('Error in /api/admin-update-user:', err.message);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
});

app.get('/', (_req, res) => {
  res.send('LINE messaging API server running');
});

httpServer.listen(PORT, () => {
  console.log(`LINE messaging server listening on http://localhost:${PORT}`);

  // Bridge Supabase Realtime to Socket.io
  // This ensures that even changes made directly to Supabase (e.g. from the client)
  // are broadcasted via our Socket.io websocket.
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    supabaseAdmin
      .channel('server-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('🔄 DB Change detected on server:', payload.eventType);
          notifyBookingUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_busy_times' },
        () => notifyBookingUpdate()
      )
      .subscribe((status) => {
        console.log(`📡 Server-side Supabase Realtime Status: ${status}`);
      });
  }

  // Start the auto-notification and cleanup loop
  setInterval(() => {
    // runAutoNotificationCheck();
    checkExpiredPromotions();
    runOverdueBookingCleanup();
  }, 60000);
  console.log('🚀 Auto-notification sync active (Checking every minute)');
});

// const runAutoNotificationCheck = async () => {
//   const SUPABASE_URL = process.env.SUPABASE_URL;
//   const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LINE_CHANNEL_ACCESS_TOKEN) return;
//
//   try {
//     const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
//     // Get date in YYYY-MM-DD for Thailand (GMT+7)
//     const nowLocal = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
//     const today = nowLocal.toISOString().split('T')[0];
//
//     // Clear notified set at midnight (roughly)
//     if (nowLocal.getUTCHours() === 0 && nowLocal.getUTCMinutes() === 0) {
//       notifiedBookings.clear();
//     }
//
//     const { data: bookings, error } = await supabaseAdmin
//       .from('bookings')
//       .select('*')
//       .eq('booking_date', today)
//       .in('status', ['Pending', 'Confirmed']);
//
//     if (error || !bookings) return;
//
//     const currentHour = nowLocal.getUTCHours();
//     const currentMin = nowLocal.getUTCMinutes();
//
//     for (const b of bookings) {
//       if (notifiedBookings.has(b.id)) continue;
//
//       const [bh, bm] = b.booking_time.split(':').map(Number);
//       const diffMins = (bh * 60 + bm) - (currentHour * 60 + currentMin);
//
//       // Notify 15 minutes before the booking
//       if (diffMins >= 0 && diffMins <= 15) {
//         let lineUserId = null;
//         if (b.user_id) {
//           const { data: p } = await supabaseAdmin.from('profiles').select('line_user_id').eq('id', b.user_id).single();
//           lineUserId = p?.line_user_id;
//         }
//
//         if (lineUserId) {
//           console.log(`[AutoNotify] Sending to ${b.customer_name} for ${b.booking_time}`);
//           const message = {
//             to: lineUserId,
//             messages: [
//               {
//                 type: 'text',
//                 text: `🔔 แจ้งเตือนอัตโนมัติ: คุณ ${b.customer_name} ครับ\nใกล้ถึงเวลานัดของคุณแล้วในเวลา ${b.booking_time.slice(0, 5)} น. 🕒\n\nกรุณาเตรียมตัวเข้ามาใช้บริการได้เลยครับ ✨`
//               }
//             ]
//           };
//
//           await axios.post(LINE_PUSH_API, message, {
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
//             }
//           });
//           notifiedBookings.add(b.id);
//         }
//       }
//     }
//   } catch (err) {
//     console.error('AutoNotification Error:', err.message);
//   }
// };

const runOverdueBookingCleanup = async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Get current date in Thailand (GMT+7)
    const nowLocal = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const todayStr = nowLocal.toISOString().split('T')[0];
    const currentHour = nowLocal.getUTCHours();
    console.log(`[Cleanup Check] Current Hour (TH): ${currentHour}, Today: ${todayStr}`);

    // If it's 9 PM (21:00) or later, we cancel today's pending bookings.
    // Otherwise, we only cancel bookings from previous days.
    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('status', 'Pending');

    if (currentHour >= 21) {
      // After 9 PM, cancel everything up to and including today
      query = query.lte('booking_date', todayStr);
    } else {
      // Before 9 PM, only cancel previous days
      query = query.lt('booking_date', todayStr);
    }

    const { data: bookings, error } = await query;

    if (error || !bookings) return;

    for (const b of bookings) {
      const isToday = b.booking_date === todayStr;
      console.log(`[Cleanup] Cancelling ${isToday ? 'today\'s unfinished' : 'overdue'} booking #${b.id} (${b.customer_name}) - Date: ${b.booking_date}`);

      // 1. Update status to Cancelled
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', b.id);

      if (updateError) {
        console.error(`[Cleanup] Failed to cancel booking #${b.id}:`, updateError.message);
        continue;
      }

      // 2. Notify User via LINE
      const formattedDate = new Date(b.booking_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      const msg = `❌ ระบบยกเลิกคิวอัตโนมัติ\n\nเรียนคุณ ${b.customer_name}\nเนื่องจากขณะนี้เลยเวลา 21:00 น. ของวันที่ ${formattedDate} และลูกค้าไม่มาใช้บริการของเรา ระบบจึงขออนุญาตยกเลิกคิวอัตโนมัติครับ 🙏\n\nหากต้องการใช้บริการ รบกวนทำการจองใหม่ในภายหลังครับ ✨`;

      try {
        await sendLineNotification(supabaseAdmin, b, msg);
      } catch (notifyErr) {
        console.warn(`[Cleanup] Failed to notify ${b.customer_name}:`, notifyErr.message);
      }
    }
  } catch (err) {
    console.error('Overdue Cleanup Error:', err.message);
  }
};

const checkExpiredPromotions = async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const nowLocal = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const today = nowLocal.toISOString().split('T')[0];

    // Find active promotions that have expired (expire_date < today)
    const { data: expiredPromos, error } = await supabaseAdmin
      .from('promotions')
      .select('id, title')
      .eq('active', true)
      .lt('expire_date', today);

    if (error) {
      // Ignore "is null" errors if any, but regular select shouldn't error
      console.error('Error querying expired promos:', error.message);
      return;
    }

    if (expiredPromos && expiredPromos.length > 0) {
      console.log(`[AutoExpire] Found ${expiredPromos.length} expired promotions:`, expiredPromos.map(p => p.title));

      // Deactivate them
      const { error: updateError } = await supabaseAdmin
        .from('promotions')
        .update({ active: false })
        .in('id', expiredPromos.map(p => p.id));

      if (updateError) throw updateError;
      console.log(`[AutoExpire] Successfully deactivated ${expiredPromos.length} promotions.`);
    }
  } catch (err) {
    console.error('Error in checkExpiredPromotions:', err.message);
  }
};
