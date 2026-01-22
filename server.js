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

// --- HELPER FUNCTION FOR LINE NOTIFICATION ---
async function sendLineNotification(supabaseAdmin, booking) {
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
    throw new Error('ลูกค้ายังไม่ได้เชื่อมต่อระบบ LINE');
  }

  const message = {
    to: lineUserId,
    messages: [
      {
        type: 'text',
        text: `📢 คุณ ${booking.customer_name} ครับ\nใกล้ถึงคิวของคุณแล้วสำหรับการบริการ: ${booking.service_name}\nเวลา: ${booking.booking_time.slice(0, 5)} น.\n\nกรุณาเตรียมตัวเข้ามาใช้บริการที่ร้าน Lor Loei Cuts ได้เลยครับ ✨`
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

