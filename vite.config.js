import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8888, // กำหนดพอร์ตที่ต้องการ
    open: true, // ถ้าพอร์ตถูกใช้ จะไม่สุ่มพอร์ตใหม่
  },
});
