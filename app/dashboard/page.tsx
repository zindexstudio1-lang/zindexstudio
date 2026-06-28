"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getEstadisticasDashboard } from "@/app/actions/prestamos";

export default function DashboardOverview() {
  const [userName, setUserName] = useState("Cargando...");
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filtroOrigen, setFiltroOrigen] = useState("todos");

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
        setStats(data);
      }
      setIsLoading(false);
    }
    loadDashboard();
  }, [filtroOrigen, userId]);

  const generarMensajeWhatsApp = (clienteNombre: string, telefono: string, cuota: any) => {
    if (!telefono) { alert("⚠️ Este cliente no tiene teléfono."); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(cuota.fecha_vencimiento + 'T12:00:00Z'); vencimiento.setHours(0, 0, 0, 0);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const montoFmt = cuota.monto_total.toFixed(2);
    const fechaFmt = vencimiento.toLocaleDateString('es-ES');
    
    let msg = diasRestantes > 1 ? `%F0%9F%91%8B Hola *${clienteNombre}*,\nTe saludamos de *Z-Index Studio*.\n\nTe recordamos amablemente que tu cuota de *S/ ${montoFmt}* vence en ${diasRestantes} días (el ${fechaFmt}).\n\n¡Gracias por tu puntualidad!` 
      : diasRestantes === 1 || diasRestantes === 0 ? `%E2%9A%A0%EF%B8%8F Hola *${clienteNombre}*.\n\nTe informamos que tu cuota de *S/ ${montoFmt}* vence *HOY* (${fechaFmt}).\n\nTienes plazo máximo para cancelar hasta mañana.\n\n¡Quedamos atentos!` 
      : `%F0%9F%9A%A8 Hola *${clienteNombre}*.\n\nTu cuota de *S/ ${montoFmt}* se encuentra *VENCIDA* por ${Math.abs(diasRestantes)} día(s).\n\nPor favor, regulariza tu pago para evitar penalidades.`;

    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.length === 9) numLimpio = '51' + numLimpio; 
    window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(msg).replace(/%25/g, '%')}`, '_blank');
  };

  const totalPagos = stats ? Object.values(stats.metodosPago).reduce((a: any, b: any) => a + b, 0) as number : 0;
  const getPorcentaje = (cantidad: number) => totalPagos === 0 ? 0 : Math.round((cantidad / totalPagos) * 100);
  const progresoCapital = stats && stats.capitalColocado > 0 ? Math.min(100, Math.round((stats.capitalRecuperado / stats.capitalColocado) * 100)) : 0;

  // --- FILTROS INTELIGENTES PARA SEPARAR ACTIVOS DE FINALIZADOS ---
  const clientesActivos = stats?.desgloseClientes?.filter((c: any) => c.estado !== 'pagado') || [];
  const clientesFinalizados = stats?.desgloseClientes?.filter((c: any) => c.estado === 'pagado') || [];

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 capitalize">
          Bienvenido, <span className="text-indigo-400">{userName}</span>
        </h1>
        <p className="text-zinc-400 text-sm">Resumen financiero global de tu cartera operativa y fondeos.</p>
      </div>

      <div className="flex space-x-2 border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setFiltroOrigen("todos")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "todos" ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Balance Global
        </button>
        <button onClick={() => setFiltroOrigen("propio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "propio" ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Mi Capital (100%)
        </button>
        <button onClick={() => setFiltroOrigen("socio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "socio" ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Fondeos de Socios
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-zinc-500 font-medium animate-pulse">Sincronizando motores financieros...</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">

          {stats.alertas && stats.alertas.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 shadow-lg shadow-red-900/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                <h2 className="text-lg font-bold text-red-400">Atención: Tienes {stats.alertas.length} cobro(s) pendiente(s) en esta cartera</h2>
              </div>
              <div className="space-y-3">
                {stats.alertas.map((alerta: any) => (
                  <div key={alerta.cuota_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-red-500/20 gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{alerta.cliente_nombre}</p>
                      <p className="text-xs text-red-400 font-medium mt-0.5">Cuota N° {alerta.numero_cuota} • S/ {alerta.monto_total.toFixed(2)} {alerta.diasRestantes < 0 ? ` (Vencido por ${Math.abs(alerta.diasRestantes)} días)` : ' (Vence hoy)'}</p>
                    </div>
                    <button onClick={() => generarMensajeWhatsApp(alerta.cliente_nombre, alerta.cliente_telefono, alerta.cuota_raw)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-lg transition-colors border border-[#25D366]/30 text-xs font-bold whitespace-nowrap">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      Avisar por WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-lg shadow-black/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-zinc-400 mb-1">Capital Total en la Calle</p>
              <h2 className="text-3xl font-bold text-white mb-2">S/ {stats.capitalColocado.toFixed(2)}</h2>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${filtroOrigen === 'propio' ? 'bg-blue-500' : filtroOrigen === 'socio' ? 'bg-purple-500' : 'bg-indigo-500'}`}></span>
                <p className={`text-xs font-medium ${filtroOrigen === 'propio' ? 'text-blue-400' : filtroOrigen === 'socio' ? 'text-purple-400' : 'text-indigo-400'}`}>Dinero trabajando o recuperado</p>
              </div>
            </div>

            <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-2xl p-6 shadow-lg shadow-black/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
              </div>
              <p className="text-sm font-medium text-emerald-500/80 mb-1">Ganancia Actual Obtenida</p>
              <h2 className="text-3xl font-bold text-emerald-400 mb-2">S/ {stats.gananciaReal.toFixed(2)}</h2>
              <div className="mt-3 pt-3 border-t border-emerald-900/30 flex justify-between items-center">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wide">Proyección al Finalizar:</p>
                <p className="text-xs font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  S/ {stats.gananciaProyectada.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-lg shadow-black/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <p className="text-sm font-medium text-zinc-400 mb-1">Contratos Activos (Con Deuda)</p>
              {/* AHORA SOLO CUENTA A LOS ACTIVOS */}
              <h2 className="text-3xl font-bold text-white mb-2">{clientesActivos.length}</h2>
              <p className="text-xs text-amber-500/70 font-medium">De un histórico de {stats.totalPrestamos} operaciones</p>
            </div>
          </div>

          {/* TABLA 1: RADIOGRAFÍA DE ACTIVOS */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl shadow-lg shadow-black/20 overflow-hidden mt-6">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Radiografía de Rendimientos (En Curso)</h3>
              <p className="text-xs text-zinc-500 mt-1">Detalle de tu ganancia limpia proyectada por cada cliente con deuda activa.</p>
            </div>
            
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm text-zinc-400">
                <thead className="text-[10px] uppercase bg-zinc-950/80 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-left whitespace-nowrap">Cliente</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Capital Colocado</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Mi Ganancia Proyectada</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Ya Cobrado</th>
                    <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Progreso de Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {clientesActivos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 whitespace-nowrap">No hay contratos activos para mostrar en este filtro.</td>
                    </tr>
                  ) : (
                    clientesActivos.map((cliente: any) => {
                      const porcentajeCobrado = cliente.gananciaProyectada > 0 
                        ? Math.min(100, Math.round((cliente.gananciaReal / cliente.gananciaProyectada) * 100)) 
                        : 0;

                      return (
                        <tr key={cliente.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-bold text-white">{cliente.cliente}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{cliente.tipoFondeo}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-zinc-300 whitespace-nowrap">
                            S/ {cliente.capital.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                              S/ {cliente.gananciaProyectada.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-emerald-500/70 whitespace-nowrap">
                            S/ {cliente.gananciaReal.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-3 min-w-[120px]">
                              <span className="text-xs font-medium text-zinc-300">{porcentajeCobrado}%</span>
                              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
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
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-2xl shadow-lg shadow-black/20 overflow-hidden mt-6 opacity-70 hover:opacity-100 transition-opacity">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-950/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Historial de Éxito (Finalizados)</h3>
                  <p className="text-xs text-zinc-600 mt-1">Clientes que ya liquidaron su deuda al 100%.</p>
                </div>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-md font-bold">{clientesFinalizados.length}</span>
              </div>
              
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-sm text-zinc-500">
                  <thead className="text-[10px] uppercase bg-zinc-950/30 text-zinc-600 border-b border-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-left whitespace-nowrap">Cliente</th>
                      <th className="px-6 py-3 font-semibold text-center whitespace-nowrap">Capital Retornado</th>
                      <th className="px-6 py-3 font-semibold text-center whitespace-nowrap">Ganancia Obtenida</th>
                      <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {clientesFinalizados.map((cliente: any) => (
                      <tr key={cliente.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <p className="font-bold text-zinc-300">{cliente.cliente}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{cliente.tipoFondeo}</p>
                        </td>
                        <td className="px-6 py-3 text-center font-medium whitespace-nowrap">
                          S/ {cliente.capital.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-center whitespace-nowrap font-bold text-emerald-500/50">
                          S/ {cliente.gananciaReal.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-700/50 px-2 py-1 rounded">
                            Liquidado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-lg shadow-black/20">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-6">Velocidad de Retorno de Capital</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-2xl font-bold text-white">S/ {stats.capitalRecuperado.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 font-medium">Recuperado de S/ {stats.capitalColocado.toFixed(2)}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/20">
                    {progresoCapital}% Completado
                  </span>
                </div>
                <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 ease-out" style={{ width: `${progresoCapital}%` }}></div>
                </div>
                <p className="text-[10px] text-zinc-500 text-right uppercase tracking-wide">Amortizaciones confirmadas en caja</p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-lg shadow-black/20">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-6">Distribución de Pagos</h3>
              {totalPagos === 0 ? (
                <div className="h-full flex items-center justify-center pb-8"><p className="text-sm text-zinc-600 font-medium">Aún no hay cobros registrados.</p></div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#74246D]">YAPE</span>
                      <span className="text-zinc-400 font-medium">{getPorcentaje(stats.metodosPago.yape)}% ({stats.metodosPago.yape})</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-[#74246D] transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.yape)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-emerald-500">EFECTIVO FÍSICO</span>
                      <span className="text-zinc-400 font-medium">{getPorcentaje(stats.metodosPago.efectivo)}% ({stats.metodosPago.efectivo})</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.efectivo)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#00E1C2]">PLIN</span>
                      <span className="text-zinc-400 font-medium">{getPorcentaje(stats.metodosPago.plin)}% ({stats.metodosPago.plin})</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00E1C2] transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.plin)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-blue-500">TRANSFERENCIAS (Bancos)</span>
                      <span className="text-zinc-400 font-medium">{getPorcentaje(stats.metodosPago.transferencia)}% ({stats.metodosPago.transferencia})</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${getPorcentaje(stats.metodosPago.transferencia)}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Link href="/dashboard/finanzas" className="group p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 hover:border-indigo-500/30 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Operar Capital</h3>
                  <p className="text-xs text-zinc-500">Ir al panel de Finanzas</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>

            <Link href="/dashboard/inversionista" className="group p-5 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 hover:border-purple-500/30 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Auditar Fondeos</h3>
                  <p className="text-xs text-zinc-500">Ir a Central Inversionistas</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-zinc-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}