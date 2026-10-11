"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getEstadisticasDashboard, getCuotasPorPrestamo } from "@/app/actions/prestamos";

// 1. Interfaces para eliminar por completo el uso de 'any'
interface IAlerta {
  cuota_id: string;
  numero_cuota: number;
  diasRestantes: number;
  monto_total: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cuota_raw: Record<string, unknown>;
}

interface IClienteDesglose {
  id: string;
  cliente: string;
  telefono: string;
  capital: number;
  gananciaProyectada: number;
  gananciaReal: number;
  tipoFondeo: string;
  estado: string;
}

interface IMetodosPago {
  efectivo: number;
  yape: number;
  plin: number;
  transferencia: number;
  [key: string]: number;
}

interface IStats {
  capitalColocado: number;
  capitalRecuperado: number;
  gananciaReal: number;
  gananciaProyectada: number;
  metodosPago: IMetodosPago;
  totalPrestamos: number;
  desgloseClientes: IClienteDesglose[];
  alertas: IAlerta[];
}

interface ICuotaHistorial {
  id: string;
  monto_capital?: number;
  monto_interes?: number;
  monto_total?: number;
  fecha_pago_real?: string;
  metodo_pago?: string;
}

export default function DashboardOverview() {
  const [userName, setUserName] = useState("Cargando...");
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<IStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filtroOrigen, setFiltroOrigen] = useState("todos");

  // --- ESTADOS PARA EL MODAL DE AUDITORÍA ---
  const [selectedHistorial, setSelectedHistorial] = useState<IClienteDesglose | null>(null);
  const [cuotasHistorial, setCuotasHistorial] = useState<ICuotaHistorial[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      const supabase = createClient();
      
      let currentId = userId;
      if (!currentId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentId = user.id;
          setUserId(user.id);
          setUserName(user.email?.split('@')[0] || "Usuario");
        }
      }

      if (currentId) {
        const data = await getEstadisticasDashboard(currentId, filtroOrigen);
        setStats(data as unknown as IStats);
      }
      setIsLoading(false);
    }
    loadDashboard();
  }, [filtroOrigen, userId]);

  const generarMensajeWhatsApp = (clienteNombre: string, telefono: string, cuota: Record<string, unknown>) => {
    if (!telefono) { alert("⚠️ Este cliente no tiene teléfono."); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaVenc = cuota.fecha_vencimiento as string;
    const vencimiento = new Date(fechaVenc + 'T12:00:00Z'); vencimiento.setHours(0, 0, 0, 0);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    const montoTotal = cuota.monto_total as number;
    const montoFmt = montoTotal.toFixed(2);
    const fechaFmt = vencimiento.toLocaleDateString('es-ES');
    
    const msg = diasRestantes > 1 ? `%F0%9F%91%8B Hola *${clienteNombre}*,\nTe saludamos de *Laboriano Capital*.\n\nTe recordamos amablemente que tu cuota de *S/ ${montoFmt}* vence en ${diasRestantes} días (el ${fechaFmt}).\n\n¡Gracias por tu puntualidad!` 
  : diasRestantes === 1 || diasRestantes === 0 ? `%E2%9A%A0%EF%B8%8F Hola *${clienteNombre}*.\n\nTe informamos que tu cuota de *S/ ${montoFmt}* vence *HOY* (${fechaFmt}).\n\nTienes plazo máximo para cancelar hasta mañana.\n\n¡Quedamos atentos!` 
  : `%F0%9F%9A%A8 Hola *${clienteNombre}*.\n\nTu cuota de *S/ ${montoFmt}* se encuentra *VENCIDA* por ${Math.abs(diasRestantes)} día(s).\n\nPor favor, regulariza tu pago para evitar penalidades.`;
  
    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.length === 9) numLimpio = '51' + numLimpio; 
    window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(msg).replace(/%25/g, '%')}`, '_blank');
  };

  const abrirAuditoria = async (cliente: IClienteDesglose) => {
    setSelectedHistorial(cliente);
    setIsLoadingHistorial(true);
    try {
      const data = await getCuotasPorPrestamo(cliente.id);
      setCuotasHistorial((data || []) as ICuotaHistorial[]);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingHistorial(false);
  };

  const totalPagos = stats ? Object.values(stats.metodosPago).reduce((a, b) => a + b, 0) : 0;
  const getPorcentaje = (cantidad: number) => totalPagos === 0 ? 0 : Math.round((cantidad / totalPagos) * 100);
  const progresoCapital = stats && stats.capitalColocado > 0 ? Math.min(100, Math.round((stats.capitalRecuperado / stats.capitalColocado) * 100)) : 0;

  const clientesActivos = stats?.desgloseClientes?.filter(c => c.estado !== 'pagado') || [];
  const clientesFinalizados = stats?.desgloseClientes?.filter(c => c.estado === 'pagado') || [];

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500 relative bg-[#F8FAFC] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-400 mb-2 capitalize">
          Bienvenido, <span className="text-[#C5A059]">{userName}</span>
        </h1>
        <p className="text-slate-500 text-sm">Resumen financiero global de tu cartera operativa y fondeos.</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setFiltroOrigen("todos")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "todos" ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/5' : 'border-transparent text-slate-500 hover:text-[#0B172A] hover:bg-slate-100'}`}>
          Balance Global
        </button>
        <button onClick={() => setFiltroOrigen("propio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "propio" ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-slate-500 hover:text-[#0B172A] hover:bg-slate-100'}`}>
          Mi Capital (100%)
        </button>
        <button onClick={() => setFiltroOrigen("socio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "socio" ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-[#0B172A] hover:bg-slate-100'}`}>
          Fondeos de Socios
        </button>
      </div>

      {isLoading || !stats ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 font-bold animate-pulse">Sincronizando motores financieros...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">

          {stats.alertas && stats.alertas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                <h2 className="text-lg font-bold text-red-600">Atención: Tienes {stats.alertas.length} cobro(s) pendiente(s) en esta cartera</h2>
              </div>
              <div className="space-y-3">
                {stats.alertas.map((alerta) => (
                  <div key={alerta.cuota_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-red-100 shadow-sm gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#0B172A]">{alerta.cliente_nombre}</p>
                      <p className="text-xs text-red-500 font-bold mt-0.5">Cuota N° {alerta.numero_cuota} • S/ {alerta.monto_total.toFixed(2)} {alerta.diasRestantes < 0 ? ` (Vencido por ${Math.abs(alerta.diasRestantes)} días)` : ' (Vence hoy)'}</p>
                    </div>
                    <button onClick={() => generarMensajeWhatsApp(alerta.cliente_nombre, alerta.cliente_telefono, alerta.cuota_raw)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-lg transition-colors border border-[#25D366] text-xs font-bold whitespace-nowrap shadow-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      Avisar por WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-16 h-16 text-[#0B172A]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Capital Total en la Calle</p>
              <h2 className="text-3xl font-bold text-[#0B172A] mb-2">S/ {stats.capitalColocado.toFixed(2)}</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${filtroOrigen === 'propio' ? 'bg-blue-600' : filtroOrigen === 'socio' ? 'bg-purple-600' : 'bg-[#C5A059]'}`}></span>
                <p className={`text-xs font-bold ${filtroOrigen === 'propio' ? 'text-blue-600' : filtroOrigen === 'socio' ? 'text-purple-600' : 'text-[#C5A059]'}`}>Dinero trabajando o recuperado</p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
              </div>
              <p className="text-sm font-bold text-emerald-600 mb-1">Ganancia Actual Obtenida</p>
              <h2 className="text-3xl font-bold text-emerald-700 mb-2">S/ {stats.gananciaReal.toFixed(2)}</h2>
              <div className="mt-3 pt-3 border-t border-emerald-200/50 flex justify-between items-center">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Proyección al Finalizar:</p>
                <p className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-sm border border-emerald-100">
                  S/ {stats.gananciaProyectada.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Contratos Activos (Con Deuda)</p>
              <h2 className="text-3xl font-bold text-[#0B172A] mb-2">{clientesActivos.length}</h2>
              <p className="text-xs text-amber-600 font-bold">De un histórico de {stats.totalPrestamos} operaciones</p>
            </div>
          </div>

          {/* TABLA 1: RADIOGRAFÍA DE ACTIVOS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-[#0B172A] uppercase tracking-wider">Radiografía de Rendimientos (En Curso)</h3>
              <p className="text-xs text-slate-500 mt-1">Detalle de tu ganancia limpia proyectada por cada cliente con deuda activa.</p>
            </div>
            
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm text-slate-600">
                <thead className="text-[10px] uppercase bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-left whitespace-nowrap">Cliente</th>
                    <th className="px-6 py-4 font-bold text-center whitespace-nowrap">Capital Colocado</th>
                    <th className="px-6 py-4 font-bold text-center whitespace-nowrap">Mi Ganancia Proyectada</th>
                    <th className="px-6 py-4 font-bold text-center whitespace-nowrap">Ya Cobrado</th>
                    <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Progreso de Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesActivos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium whitespace-nowrap">No hay contratos activos para mostrar en este filtro.</td>
                    </tr>
                  ) : (
                    clientesActivos.map((cliente) => {
                      const porcentajeCobrado = cliente.gananciaProyectada > 0 
                        ? Math.min(100, Math.round((cliente.gananciaReal / cliente.gananciaProyectada) * 100)) 
                        : 0;

                      return (
                        <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-[#0B172A]">{cliente.cliente}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{cliente.tipoFondeo}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600 whitespace-nowrap">
                            S/ {cliente.capital.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              S/ {cliente.gananciaProyectada.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                            S/ {cliente.gananciaReal.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-3 min-w-[120px]">
                              <span className="text-xs font-bold text-slate-600">{porcentajeCobrado}%</span>
                              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${porcentajeCobrado}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA 2: HISTORIAL DE FINALIZADOS */}
          {clientesFinalizados.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6 transition-all hover:bg-white hover:shadow-md">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Historial de Éxito (Finalizados)</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Clientes que ya liquidaron su deuda al 100%.</p>
                </div>
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-md font-bold shadow-inner">{clientesFinalizados.length}</span>
              </div>
              
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-sm text-slate-500">
                  <thead className="text-[10px] uppercase bg-white text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-bold text-left whitespace-nowrap">Cliente</th>
                      <th className="px-6 py-3 font-bold text-center whitespace-nowrap">Capital Retornado</th>
                      <th className="px-6 py-3 font-bold text-center whitespace-nowrap">Ganancia Obtenida</th>
                      <th className="px-6 py-3 font-bold text-center whitespace-nowrap">Estado</th>
                      <th className="px-6 py-3 font-bold text-right whitespace-nowrap">Auditoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientesFinalizados.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-slate-100 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <p className="font-bold text-slate-700">{cliente.cliente}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{cliente.tipoFondeo}</p>
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-slate-600 whitespace-nowrap">
                          S/ {cliente.capital.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-center whitespace-nowrap font-bold text-emerald-600">
                          S/ {cliente.gananciaReal.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-center whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-300 bg-white px-2 py-1 rounded shadow-sm">
                            Liquidado
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <button 
                            onClick={() => abrirAuditoria(cliente)}
                            className="inline-flex p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-[#0B172A] transition-all"
                            title="Ver Auditoría Interna"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0B172A] uppercase tracking-wider mb-6">Velocidad de Retorno de Capital</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-2xl font-bold text-[#0B172A]">S/ {stats.capitalRecuperado.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">Recuperado de S/ {stats.capitalColocado.toFixed(2)}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#C5A059]/10 text-[#C5A059] text-xs font-bold rounded-lg border border-[#C5A059]/30 shadow-sm">
                    {progresoCapital}% Completado
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[#0B172A] to-[#C5A059] transition-all duration-1000 ease-out" style={{ width: `${progresoCapital}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold text-right uppercase tracking-wide">Amortizaciones confirmadas en caja</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0B172A] uppercase tracking-wider mb-6">Distribución de Pagos</h3>
              {totalPagos === 0 ? (
                <div className="h-full flex items-center justify-center pb-8"><p className="text-sm text-slate-400 font-bold">Aún no hay cobros registrados.</p></div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#74246D]">YAPE</span>
                      <span className="text-slate-500 font-bold">{getPorcentaje(stats.metodosPago.yape)}% ({stats.metodosPago.yape})</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-[#74246D] transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.yape)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-emerald-500">EFECTIVO FÍSICO</span>
                      <span className="text-slate-500 font-bold">{getPorcentaje(stats.metodosPago.efectivo)}% ({stats.metodosPago.efectivo})</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.efectivo)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#00E1C2]">PLIN</span>
                      <span className="text-slate-500 font-bold">{getPorcentaje(stats.metodosPago.plin)}% ({stats.metodosPago.plin})</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-[#00E1C2] transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.plin)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-blue-600">TRANSFERENCIAS (Bancos)</span>
                      <span className="text-slate-500 font-bold">{getPorcentaje(stats.metodosPago.transferencia)}% ({stats.metodosPago.transferencia})</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.transferencia)}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Link href="/dashboard/finanzas" className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-[#0B172A] hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0B172A] flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B172A] transition-colors">Operar Capital</h3>
                  <p className="text-xs text-slate-500 font-medium">Ir al panel de Finanzas</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-[#0B172A] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>

            <Link href="/dashboard/inversionista" className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-[#0B172A] hover:shadow-md transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white border-2 border-[#C5A059] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B172A] transition-colors">Auditar Fondeos</h3>
                  <p className="text-xs text-slate-500 font-medium">Ir a Central Inversionistas</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-[#C5A059] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        </div>
      )}

      {/* MODAL INTERNO DE AUDITORÍA */}
      {selectedHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedHistorial(null)}></button>
          
          <div className="relative z-10 w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-[#0B172A]">Auditoría de Retornos (Finalizado)</h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Cliente: <span className="text-[#0B172A] font-bold">{selectedHistorial.cliente}</span></p>
              </div>
              <button onClick={() => setSelectedHistorial(null)} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-[#0B172A] rounded-xl transition-colors shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto no-scrollbar flex-1 bg-white">
              {isLoadingHistorial ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin"></div>
                </div>
              ) : cuotasHistorial.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-bold">No se encontraron cuotas para este contrato.</div>
              ) : (
                <div className="overflow-x-auto no-scrollbar border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold text-center">N°</th>
                        <th className="px-4 py-3 font-bold text-center">Dev. Capital</th>
                        <th className="px-4 py-3 font-bold text-center">Mi Ganancia</th>
                        <th className="px-4 py-3 font-bold text-center text-emerald-600">Total Pagado</th>
                        <th className="px-4 py-3 font-bold text-center">Fecha Pago</th>
                        <th className="px-4 py-3 font-bold text-center">Método</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {cuotasHistorial.map((cuota, index) => (
                        <tr key={cuota.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-[#0B172A]">{index + 1}</td>
                          <td className="px-4 py-3 text-center text-slate-600 font-medium">
                            S/ {(Number(cuota.monto_capital) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 font-medium">
                            S/ {(Number(cuota.monto_interes) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">
                            S/ {(Number(cuota.monto_total) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">
                            {cuota.fecha_pago_real ? new Date(cuota.fecha_pago_real).toLocaleDateString('es-ES') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-bold capitalize">
                            <span className={`px-2 py-1 rounded-md border shadow-sm ${
                              cuota.metodo_pago === 'yape' ? 'text-[#74246D] bg-white border-[#74246D]/30' :
                              cuota.metodo_pago === 'plin' ? 'text-[#00E1C2] bg-white border-[#00E1C2]/30' :
                              cuota.metodo_pago === 'efectivo' ? 'text-emerald-600 bg-white border-emerald-300' :
                              'text-blue-600 bg-white border-blue-300'
                            }`}>
                              {cuota.metodo_pago || 'Pagado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 md:p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedHistorial(null)} className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-lg transition-colors shadow-sm">
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}