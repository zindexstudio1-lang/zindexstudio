"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getPrestamosActivos } from "@/app/actions/prestamos";
import Link from "next/link";

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCapital: 0,
    prestamosActivos: 0,
    gananciaProyectada: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
        const prestamos = await getPrestamosActivos(user.id);
        
        let capital = 0;
        let ganancia = 0;

        prestamos.forEach((p: any) => {
          capital += p.monto_capital;
          // Matemática de proyección: (Capital * Tasa%) * Meses
          ganancia += (p.monto_capital * (p.tasa_interes / 100)) * p.plazo_meses;
        });

        setStats({
          totalCapital: capital,
          prestamosActivos: prestamos.length,
          gananciaProyectada: ganancia,
        });
        
        setIsLoading(false);
      }
    }
    
    loadDashboardData();
  }, []);

  return (
    <div className="p-4 md:p-8 relative">
      
      {/* HEADER DEL DASHBOARD */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Bienvenido, <span className="text-indigo-400 capitalize">{currentUser?.email?.split('@')[0] || 'Operador'}</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Resumen financiero global de tu cartera en <strong className="text-zinc-300">Z-Index Studio</strong>.
        </p>
      </div>

      {/* TARJETAS DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Tarjeta 1: Capital en la Calle */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Capital Total Desembolsado</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-white">
              {isLoading ? "---" : `S/ ${stats.totalCapital.toFixed(2)}`}
            </h2>
          </div>
          <p className="text-xs text-indigo-400 mt-2 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Dinero trabajando en la calle
          </p>
        </div>

        {/* Tarjeta 2: Ganancia Proyectada */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Ganancia Neta Proyectada</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-emerald-400">
              {isLoading ? "---" : `S/ ${stats.gananciaProyectada.toFixed(2)}`}
            </h2>
          </div>
          <p className="text-xs text-emerald-500/80 mt-2 font-medium">Retorno esperado al finalizar contratos</p>
        </div>

        {/* Tarjeta 3: Contratos Activos */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Préstamos Activos</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold text-white">
              {isLoading ? "-" : stats.prestamosActivos}
            </h2>
          </div>
          <p className="text-xs text-amber-500/80 mt-2 font-medium">Clientes con cartera vigente</p>
        </div>

      </div>

      {/* ACCIONES RÁPIDAS Y ESTADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Atajos */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <Link href="/dashboard/finanzas" className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Estructurar Nuevo Préstamo</p>
                  <p className="text-xs text-zinc-500">Registrar un nuevo cliente o capital</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>

            <Link href="/dashboard/inversionistas" className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Central de Auditoría</p>
                  <p className="text-xs text-zinc-500">Validar pagos y carteras de socios</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full"></span>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Motores en Línea</h3>
          <p className="text-sm text-zinc-400 max-w-xs">
            Bases de datos Supabase conectadas. La matemática de amortización y espejos de socios están operando al 100%.
          </p>
        </div>

      </div>
    </div>
  );
}