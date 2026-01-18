// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <Navbar />
      <main className="pt-20 px-4">
        <Outlet />
      </main>
    </div>
  );
}
