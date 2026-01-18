import { createContext, useState, useEffect } from "react";
import { axiosClient } from "../api/axiosClient";

// แก้ไขจุดที่ 1: ใส่ comment เพื่อปิด Error เรื่อง Fast refresh สำหรับบรรทัดนี้
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // เช็คว่ามี Token ในเครื่องไหม ตอนกด Refresh หน้าเว็บ
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // ยิงไปถาม Backend ว่า Token นี้เป็นของใคร
          const { data } = await axiosClient.get("/auth/me"); 
          setUser(data);
        } catch { 
          // แก้ไขจุดที่ 2: ลบ (error) ออก เปลี่ยนเป็น catch เฉยๆ เพราะไม่ได้ใช้งานตัวแปร error
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    // ยิง API Login
    const { data } = await axiosClient.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token); // เก็บ Token
    setUser(data.user); // เก็บข้อมูล User
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};