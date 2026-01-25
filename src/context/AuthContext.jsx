import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabase/client";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูล admin status จาก profiles table
  const fetchUserRole = async (userId) => {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('Error fetching user role:', error.message);
        return false;
      }

      const adminStatus = data?.is_admin ?? false;
      console.log(`User Role Check: Is Admin? -> ${adminStatus}`);
      setIsAdmin(adminStatus); // อัปเดต State ตรงนี้
      return adminStatus;
    } catch (err) {
      console.error('Critical error fetching user role:', err);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      // 1. ตรวจสอบ Session ปัจจุบัน (ตอน Refresh หน้าจอ)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      setLoading(false);
    };

    initializeAuth();

    // 2. Listener สำหรับ Auth State Change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Log นี้อาจจะขึ้นช้ากว่าการ Redirect ในบางครั้ง
        if (session?.user) {
          setUser(session.user);
          // เราจะไม่ set loading ตรงนี้ เพราะจะไปตีกับฟังก์ชัน login หลัก
          // ปล่อยให้มัน update state เงียบๆ ถ้าเป็นการ refresh token
          if (event === 'TOKEN_REFRESHED') {
            await fetchUserRole(session.user.id);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- แก้ไขจุดสำคัญตรงนี้ ---
  const login = async (email, password) => {
    if (!supabase) throw new Error("Supabase is not configured.");

    // 1. เริ่ม Loading ทันทีที่กด Login เพื่อบล็อกหน้าจอไม่ให้ Redirect มั่ว
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // 2. ถ้า Login สำเร็จ ให้ดึง Role ทันที (ไม่ต้องรอ Listener)
      if (data.session?.user) {
        setUser(data.session.user);
        await fetchUserRole(data.session.user.id);
      }
    } catch (error) {
      throw error;
    } finally {
      // 3. เมื่อเช็คทุกอย่างเสร็จค่อยปลด Loading (ตอนนี้ isAdmin จะเป็นค่าที่ถูกต้องแล้ว)
      setLoading(false);
    }
  };

  const register = async (email, password, options) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signUp({ email, password, options });
    if (error) throw error;
  };

  const logout = async () => {
    if (!supabase) throw new Error("Supabase is not configured.");

    // 1. Clear LIFF session if available
    if (window.liff && window.liff.isLoggedIn()) {
      try {
        window.liff.logout();
        console.log("LINE Logout successful");
      } catch (err) {
        console.error("LINE Logout error:", err);
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error.message);
    setUser(null);
    setIsAdmin(false);
  };

  const loginWithLine = async (liffProfile) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    setLoading(true);

    const lineEmail = `line_${liffProfile.userId}@line.me`;
    const dummyPassword = `LineAuth_${liffProfile.userId}`; // Deterministic password for LINE users

    try {
      // 1. Try to sign in
      let { data, error } = await supabase.auth.signInWithPassword({
        email: lineEmail,
        password: dummyPassword,
      });

      // 2. If user doesn't exist, sign up
      if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: lineEmail,
          password: dummyPassword,
          options: {
            data: {
              name: liffProfile.displayName,
              avatar_url: liffProfile.pictureUrl,
              line_user_id: liffProfile.userId
            }
          }
        });

        if (signUpError) throw signUpError;
        data = signUpData;
      } else if (error) {
        throw error;
      }

      // 3. Update local state and fetch role
      if (data.session?.user) {
        setUser(data.session.user);

        // Ensure profile has line_user_id updated
        await supabase
          .from('profiles')
          .update({
            line_user_id: liffProfile.userId,
            full_name: liffProfile.displayName,
            avatar_url: liffProfile.pictureUrl
          })
          .eq('id', data.session.user.id);

        await fetchUserRole(data.session.user.id);
      }
      return data;
    } catch (error) {
      console.error("LINE Login internal error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, register, login, logout, loginWithLine, loading }}>
      {children}
    </AuthContext.Provider>
  );
};