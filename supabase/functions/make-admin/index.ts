
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Headers สำหรับ CORS (Cross-Origin Resource Sharing)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // ตอบกลับ request แบบ OPTIONS ทันที (สำหรับ preflight request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // สร้าง Admin Supabase client โดยใช้ service_role key
    // Function จะดึงค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY จาก environment variables โดยอัตโนมัติ
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ดึงค่า email จาก request body
    const { email } = await req.json()
    if (!email) {
      throw new Error('กรุณาระบุ email ใน request body')
    }

    // 1. ค้นหาผู้ใช้ทั้งหมดในระบบ
    // หมายเหตุ: การดึงผู้ใช้ทั้งหมดอาจไม่เหมาะกับระบบที่มีผู้ใช้จำนวนมาก
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      throw new Error(`เกิดข้อผิดพลาดในการดึงรายชื่อผู้ใช้: ${listError.message}`)
    }

    // 2. ค้นหาผู้ใช้ด้วย email ที่ระบุ
    const user = users.find(u => u.email === email)

    if (!user) {
      return new Response(JSON.stringify({ error: 'ไม่พบผู้ใช้นี้ในระบบ' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const userId = user.id

    // 3. อัปเดตตาราง profiles เพื่อตั้งค่า is_admin = true
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', userId)

    if (updateError) {
      throw new Error(`เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์: ${updateError.message}`)
    }

    // ส่ง response ตอบกลับเมื่อทำสำเร็จ
    const responseData = { message: `กำหนดสิทธิ์แอดมินให้ ${email} สำเร็จแล้ว` }
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // จัดการข้อผิดพลาดทั้งหมด
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
