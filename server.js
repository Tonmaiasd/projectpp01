import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv'; // Import dotenv
import { createClient } from '@supabase/supabase-js'; // Added missing import

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

    const { data: bookings, error: fError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .eq('status', 'Pending');

    if (fError) throw fError;

    // 2. บันทึกการหยุดร้านทั้งวันลงในตาราง admin_busy_times (ทำเสมอแม้ไม่มีคิว)
    const { error: iError } = await supabaseAdmin
      .from('admin_busy_times')
      .insert([{
        busy_date: date,
        start_time: '09:00', // เวลาเริ่มต้นร้าน
        end_time: '20:00',   // เวลาปิดร้าน
        is_full_day: true
      }]);

    if (iError) {
      console.error('Failed to record full day busy time:', iError.message);
      return res.status(500).json({ error: 'ไม่สามารถบันทึกเวลาหยุดร้านได้ (ตรวจสอบว่าสร้างตาราง admin_busy_times หรือยัง): ' + iError.message });
    }

    if (!bookings || bookings.length === 0) {
      return res.json({ success: true, message: 'ประกาศหยุดร้านเรียบร้อยแล้ว (ไม่มีคิวที่ถูกยกเลิก)', count: 0 });
    }

    const customMsg = `ขออภัยครับ วันนี้ร้านปิดหรือแอดมินติดธุระทั้งวัน จึงขออนุญาตยกเลิกคิวของคุณ และรบกวนจองเข้ามาใหม่ในวันอื่นที่สะดวกครับ 🙏`;

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

    res.json({ success: true, message: `ยกเลิกคิวทั้งวันและแจ้งเตือนเรียบร้อยแล้ว ${successCount} รายการ`, count: successCount });
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
    const { error } = await supabaseAdmin
      .from('admin_busy_times')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'ลบรายการเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error in /api/delete-holiday:', err.message);
    res.status(500).json({ error: 'Failed to delete holiday: ' + err.message });
  }
});

// Endpoint: เลื่อนคิวจองและแจ้งเตือน LINE
app.post('/api/reschedule-booking', async (req, res) => {
  const { bookingId, newDate, newTime, oldDate, oldTime, serviceName } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!bookingId || !newDate || !newTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Update Booking
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

    // 2. Send LINE Notification
    const formattedOldDate = new Date(oldDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const formattedNewDate = new Date(newDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

    const msg = `🔄 แจ้งเตือนการเลื่อนคิวจองครับ\n\nบริการ: ${serviceName}\n\n📅 เลื่อนจาก: ${formattedOldDate} (${oldTime.slice(0, 5)} น.)\n➡️ ไปเป็น: ${formattedNewDate} (${newTime.slice(0, 5)} น.)\n\nระบบได้อัปเดตเวลาให้เรียบร้อยแล้วครับ ขอบคุณครับ ✨`;

    await sendLineNotification(supabaseAdmin, booking, msg);

    res.json({ success: true, message: 'เลื่อนคิวจองและแจ้งเตือนเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error in /api/reschedule-booking:', err.message);
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
  } catch (err) {
    console.error('Error in /api/cancel-booking:', err.message);
    res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
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

  const defaultMsg = `📢 คุณ ${booking.customer_name} ครับ\nใกล้ถึงคิวของคุณแล้วสำหรับการบริการ: ${booking.service_name}\nเวลา: ${booking.booking_time.slice(0, 5)} น.\n\nกรุณาเตรียมตัวเข้ามาใช้บริการที่ร้าน Lor Loei Cuts ได้เลยครับ ✨`;

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

app.get('/', (_req, res) => {
  res.send('LINE messaging API server running');
});

app.listen(PORT, () => {
  console.log(`LINE messaging server listening on http://localhost:${PORT}`);
  // Start the auto-notification loop
  setInterval(runAutoNotificationCheck, 60000);
  console.log('🚀 Auto-notification sync active (Checking every minute)');
});

const runAutoNotificationCheck = async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LINE_CHANNEL_ACCESS_TOKEN) return;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Get date in YYYY-MM-DD for Thailand (GMT+7)
    const nowLocal = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const today = nowLocal.toISOString().split('T')[0];

    // Clear notified set at midnight (roughly)
    if (nowLocal.getUTCHours() === 0 && nowLocal.getUTCMinutes() === 0) {
      notifiedBookings.clear();
    }

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('booking_date', today)
      .in('status', ['Pending', 'Confirmed']);

    if (error || !bookings) return;

    const currentHour = nowLocal.getUTCHours();
    const currentMin = nowLocal.getUTCMinutes();

    for (const b of bookings) {
      if (notifiedBookings.has(b.id)) continue;

      const [bh, bm] = b.booking_time.split(':').map(Number);
      const diffMins = (bh * 60 + bm) - (currentHour * 60 + currentMin);

      // Notify 15 minutes before the booking
      if (diffMins >= 0 && diffMins <= 15) {
        let lineUserId = null;
        if (b.user_id) {
          const { data: p } = await supabaseAdmin.from('profiles').select('line_user_id').eq('id', b.user_id).single();
          lineUserId = p?.line_user_id;
        }

        if (lineUserId) {
          console.log(`[AutoNotify] Sending to ${b.customer_name} for ${b.booking_time}`);
          const message = {
            to: lineUserId,
            messages: [
              {
                type: 'text',
                text: `🔔 แจ้งเตือนอัตโนมัติ: คุณ ${b.customer_name} ครับ\nใกล้ถึงเวลานัดของคุณแล้วในเวลา ${b.booking_time.slice(0, 5)} น. 🕒\n\nกรุณาเตรียมตัวเข้ามาใช้บริการได้เลยครับ ✨`
              }
            ]
          };

          await axios.post(LINE_PUSH_API, message, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            }
          });
          notifiedBookings.add(b.id);
        }
      }
    }
  } catch (err) {
    console.error('AutoNotification Error:', err.message);
  }
};

