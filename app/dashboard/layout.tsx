"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { createClient } from "@/utils/supabase/client";

// Íconos SVG
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>;
const FinanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState({ email: "Cargando...", role: "..." });
  const pathname = usePathname();

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setUserData({
          email: user.email || "Usuario",
          role: profile?.role || "admin"
        });
      }
    }
    loadUser();
  }, []);

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#c39c4a]/10 text-[#c39c4a] border border-[#c39c4a]/20 font-bold transition-all shadow-sm"
      : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent font-medium transition-colors";
  };

  return (
    <div className="flex h-screen bg-[#0d1b32] overflow-hidden">
      
      {/* Barra superior móvil */}
      <div className="md:hidden absolute top-0 left-0 w-full h-16 bg-[#0d1b32]/90 backdrop-blur-xl border-b border-zinc-800 z-30 flex items-center justify-between px-4">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Laboriano <span className="text-[#c39c4a]">Capital</span>
        </h2>
        <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white p-2">
          <MenuIcon />
        </button>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Menú Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1b32] md:bg-[#0d1b32]/90 border-r border-zinc-800/80 backdrop-blur-xl flex flex-col
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/80">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Laboriano <span className="text-[#c39c4a]">Capital</span>
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-white p-1">
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)} className={getLinkClasses("/dashboard")}>
            <HomeIcon /> Dashboard
          </Link>
          
          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3">Gestión</p>
          </div>
          
          <Link href="/dashboard/usuarios" onClick={() => setIsSidebarOpen(false)} className={getLinkClasses("/dashboard/usuarios")}>
            <UsersIcon /> Mi Equipo
          </Link>

          <Link href="/dashboard/finanzas" onClick={() => setIsSidebarOpen(false)} className={getLinkClasses("/dashboard/finanzas")}>
            <FinanceIcon /> Préstamos y Capital
          </Link>

          <Link href="/dashboard/inversionista" onClick={() => setIsSidebarOpen(false)} className={getLinkClasses("/dashboard/inversionista")}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Central Inversionistas
          </Link>

          <Link 
            href="/dashboard/simulador" 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
              pathname === '/dashboard/simulador' 
                ? 'bg-[#c39c4a]/10 text-[#c39c4a] border border-[#c39c4a]/20 font-bold' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
            </svg>
            Simulador Créditos
          </Link>

          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3">Sistemas</p>
          </div>

          <Link href="/dashboard/bots" onClick={() => setIsSidebarOpen(false)} className={getLinkClasses("/dashboard/bots")}>
            <BotIcon /> Automatizaciones (RPA)
          </Link>
        </nav>        

        {/* PERFIL DE USUARIO Y BOTÓN DE SALIDA */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/20 mt-auto">
          <Link 
            href="/dashboard/perfil"
            className="flex items-center gap-3 overflow-hidden flex-1 group hover:bg-zinc-800/60 p-1.5 -ml-1.5 rounded-xl transition-all cursor-pointer"
            title="Ir a Configuración de Perfil"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-[#0d1b32] to-[#c39c4a] flex items-center justify-center text-sm font-bold text-white shadow-lg uppercase group-hover:shadow-[#c39c4a]/25 transition-all">
              {userData.email.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-white truncate w-full group-hover:text-[#c39c4a] transition-colors" title={userData.email}>
                {userData.email.split('@')[0]}
              </span>
              <span className={`text-xs mt-0.5 font-medium ${userData.role === 'super_admin' ? 'text-[#c39c4a]' : 'text-zinc-500'}`}>
                {userData.role.replace('_', ' ')}
              </span>
            </div>
          </Link>

          <button 
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            title="Cerrar Sesión"
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0 ml-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

      </aside>

      {/* AQUÍ SE APLICÓ EL COLOR CLARO AL FONDO GENERAL */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto no-scrollbar w-full bg-[#F8FAFC]">
        <div className="md:pt-0 pt-16 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}