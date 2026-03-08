
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// import axios from 'https://esm.sh/axios@1.6.8' // axios is not compatible with Deno runtime, use native fetch

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
const LINE_DEFAULT_TO = Deno.env.get('LINE_DEFAULT_TO');
const LINE_PUSH_API = 'https://api.line.me/v2/bot/message/push';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables.');
    }
    if (!LINE_DEFAULT_TO) {
      throw new Error('LINE_DEFAULT_TO is not set in environment variables. Cannot send notification.');
    }

    // Get current time to filter upcoming bookings
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Get booking_id from request body if available
    let booking_id = null;
    try {
      const body = await req.json();
      booking_id = body.booking_id;
    } catch (e) {
      // Body might be empty
    }

    let nextBooking = null;

    if (booking_id) {
      console.log(`Searching for specific booking ID: ${booking_id}`);
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('id, customer_name, service_name, booking_date, booking_time, user_id')
        .eq('id', booking_id)
        .single();
      
      if (error) {
        console.error(`Error fetching specific booking ${booking_id}:`, error.message);
      } else {
        nextBooking = data;
      }
    }

    if (!nextBooking) {
      console.log('Falling back to next upcoming booking logic...');
      // 1. Find the next upcoming booking
      const { data: bookings, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('id, customer_name, service_name, booking_date, booking_time, user_id')
        .in('status', ['Confirmed', 'Pending'])
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (bookingError) {
        throw new Error(`Error fetching bookings: ${bookingError.message}`);
      }

      // Find the very next booking that is in the future
      for (const booking of bookings) {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        if (bookingDateTime > now) {
          nextBooking = booking;
          break;
        }
      }
    }

    if (!nextBooking) {
      return new Response(JSON.stringify({ message: 'No upcoming bookings found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Fetch customer's LINE User ID from profiles table
    let targetLineId = LINE_DEFAULT_TO;
    let customerFullName = nextBooking.customer_name; // Default to booking's customer_name

    if (nextBooking.user_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, line_user_id')
        .eq('id', nextBooking.user_id)
        .single();

      if (profileError) {
        console.warn(`Error fetching profile for user_id ${nextBooking.user_id}: ${profileError.message}`);
      } else if (profile) {
        customerFullName = profile.full_name || customerFullName;
        if (profile.line_user_id) {
          targetLineId = profile.line_user_id;
        } else {
          console.warn(`line_user_id not found for user ${nextBooking.user_id}. Falling back to LINE_DEFAULT_TO.`);
        }
      }
    } else {
      console.warn(`Booking ID ${nextBooking.id} has no user_id. Sending to LINE_DEFAULT_TO.`);
    }

    // 3. Construct LINE message
    const messageText = 
      `🚨 คิวถัดไปของคุณ ${customerFullName} กำลังจะมาถึง 🚨` +
      `\nบริการ: ${nextBooking.service_name}` +
      `\nเวลาจอง: ${nextBooking.booking_date} ${nextBooking.booking_time} น.` +
      `\n\nโปรดมาที่ร้านภายใน 15 นาที หรือติดต่อร้านหากไม่สะดวก`;

    const payload = {
      to: targetLineId,
      messages: [
        {
          type: 'text',
          text: messageText,
        },
      ],
    };

    console.log('Sending LINE message with payload:', payload); // Log the payload
    console.log('Target LINE ID:', targetLineId); // Log targetLineId

    // 4. Send LINE message using Deno's native fetch
    const lineResponse = await fetch(LINE_PUSH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!lineResponse.ok) {
        const errorBody = await lineResponse.json();
        throw new Error(`LINE API responded with status ${lineResponse.status}: ${JSON.stringify(errorBody)}`);
    }

    const responseData = {
      message: `Notification sent for booking ID: ${nextBooking.id} to ${targetLineId}`,
      booking: nextBooking
    };
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in next-queue-notify function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
