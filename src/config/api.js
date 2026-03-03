// ====================================================
// API Config - จุดเดียวสำหรับ URL ของ Backend Server
// ====================================================
// ตอน dev ในเครื่อง: ใช้ http://localhost:3001
// ตอน deploy บน Vercel: ใช้ URL ของ Render ที่ตั้งใน .env
// ====================================================

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default SERVER_URL;
