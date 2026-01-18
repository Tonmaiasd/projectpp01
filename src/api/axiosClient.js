import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', // เปลี่ยนเป็น URL ของ Backend คุณ
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: ทุกครั้งที่ยิง Request ให้แนบ Token ไปด้วย (ถ้ามี)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;