"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getListaSocios } from "@/app/actions/users"; 
import { getPrestamosComoInversionista, getCuotasPorPrestamo, procesarPagoCuota } from "@/app/actions/prestamos";

export default function InversionistasPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Estados del Visor y Cobros
  const [isCuotasModalOpen, setIsCuotasModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<any>(null);
  const [cuotasList, setCuotasList] = useState<any[]>([]);
  const [isLoadingCuotas, setIsLoadingCuotas] = useState(false);
  
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<any>(null);
  const [isProcessingPago, setIsProcessingPago] = useState(false);
  const [tipoPagoForm, setTipoPagoForm] = useState("completo");

  useEffect(() => {
    async function initData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser(user);
        const [prestamosInv, sociosLista] = await Promise.all([
          getPrestamosComoInversionista(user.id),
          getListaSocios()
        ]);

        // Extraer operadores únicos (Patrick, Jimena, etc.)
        const uniqueAdminIds = Array.from(new Set(prestamosInv.map(p => p.admin_id)));
        const ops = uniqueAdminIds.map(adminId => {
          const socio = sociosLista.find(s => s.id === adminId);
          return {
            id: adminId as string,
            nombre: socio ? socio.email.split('@')[0] : 'Operador Externo'
          };
        });

        setOperadores(ops);
        if (ops.length > 0) setActiveTab(ops[0].id);
        setPrestamos(prestamosInv);
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  const prestamosActivos = prestamos.filter(p => p.admin_id === activeTab);

  // MANEJADORES DE VISTAS
  const handleVerCuotas = async (prestamo: any) => {
    setSelectedPrestamo(prestamo);
    setIsCuotasModalOpen(true);
    setIsLoadingCuotas(true);
    const data = await getCuotasPorPrestamo(prestamo.id);
    setCuotasList(data);
    setIsLoadingCuotas(false);
  };

  const handleAbrirCobro = (cuota: any) => {
    setSelectedCuota(cuota);
    setTipoPagoForm("completo"); 
    setIsPagoModalOpen(true);
  };

  const handleProcesarPagoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingPago(true);
    const formData = new FormData(e.currentTarget);
    const result = await procesarPagoCuota(formData);
    
    if (result?.error) {
      alert("Error al procesar: " + result.error); 
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
      setIsPagoModalOpen(false);
    }
    setIsProcessingPago(false);
  };

  // MATEMÁTICA DE ESPEJOS (Convierte el % de la calle al % de Edwin)
  const getRatio = () => selectedPrestamo?.tasa_interes > 0 ? (selectedPrestamo.tasa_inversionista / selectedPrestamo.tasa_interes) : 0;

  return (
    <div className="p-4 md:p-8 relative">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Central de Auditoría</h1>
        <p className="text-sm text-zinc-400">Control maestro de capitales fondeados y rendimientos por operador.</p>
      </div>

      {/* PESTAÑAS DE OPERADORES (CARTERAS) */}
      <div className="flex space-x-2 border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        {operadores.map(op => (
          <button
            key={op.id}
            onClick={() => setActiveTab(op.id)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all capitalize whitespace-nowrap ${
              activeTab === op.id ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
          >
            Cartera de {op.nombre}
          </button>
        ))}
        {!isLoading && operadores.length === 0 && (
          <div className="px-4 py-3 text-sm font-medium text-zinc-500">Sin carteras de inversión asignadas actualmente.</div>
        )}
      </div>

      {/* TABLA DE CARTERA ACTIVA */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-zinc-950/50 text-zinc-500 border-b border-zinc-800/80">
              <tr>
                <th className="px-6 py-4 font-semibold text-left">Cliente</th>
                <th className="px-6 py-4 font-semibold text-center">Capital Bruto</th>
                <th className="px-6 py-4 font-semibold text-center">Tasa Global (Calle)</th>
                <th className="px-6 py-4 font-semibold text-center text-indigo-400">Mi Tasa (Neta)</th>
                <th className="px-6 py-4 font-semibold text-center">Desembolso</th>
                <th className="px-6 py-4 font-semibold text-center">Auditar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {isLoading && <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando carteras...</td></tr>}
              {!isLoading && prestamosActivos.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{p.clientes?.nombre || "N/A"}</td>
                  <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">S/ {p.monto_capital.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap text-zinc-500">{p.plazo_meses}m / {p.tasa_interes}%</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap font-bold text-indigo-400">{p.tasa_inversionista}%</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">{p.fecha_desembolso}</td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button onClick={() => handleVerCuotas(p)} title="Auditar Cronograma" className="p-1.5 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISOR DE CRONOGRAMA PARA INVERSIONISTA (NÚMEROS CONVERTIDOS) */}
      {isCuotasModalOpen && selectedPrestamo && !isPagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCuotasModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-4xl bg-zinc-900 border border-indigo-900/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Cronograma de Retornos (Neta {selectedPrestamo.tasa_inversionista}%)</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Cartera: <span className="capitalize">{operadores.find(o => o.id === activeTab)?.nombre}</span> • Cliente: <span className="text-indigo-400 font-medium">{selectedPrestamo.clientes?.nombre}</span></p>
              </div>
              <button onClick={() => setIsCuotasModalOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-zinc-900/50">
              <table className="w-full text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-950 text-zinc-500 sticky top-0 border-b border-zinc-800 z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center">N°</th>
                    <th className="px-6 py-4 font-semibold text-right">Devolución Capital</th>
                    <th className="px-6 py-4 font-semibold text-right text-indigo-400">Mi Ganancia</th>
                    <th className="px-6 py-4 font-semibold text-right text-emerald-400">Total a Recibir</th>
                    <th className="px-6 py-4 font-semibold text-center">Vencimiento</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado (Calle)</th>
                    <th className="px-6 py-4 font-semibold text-center">Auditar Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {isLoadingCuotas ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">Calculando matemática de espejos...</td></tr>
                  ) : (
                    cuotasList.map((cuota) => {
                      // AQUÍ OCURRE LA MAGIA: Convertimos el interés de la calle a la tajada de Edwin
                      const interesSocio = cuota.interes * getRatio();
                      const totalSocio = cuota.amortizacion_capital + interesSocio;

                      return (
                        <tr key={cuota.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-6 py-4 text-center font-medium text-white">{cuota.numero_cuota}</td>
                          <td className="px-6 py-4 text-right">S/ {cuota.amortizacion_capital.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-medium text-indigo-300">S/ {interesSocio.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-400">S/ {totalSocio.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-zinc-300">{new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
                          
                          <td className="px-6 py-4 text-center">
                            {cuota.estado === 'pendiente' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">Pendiente</span>
                            ) : cuota.tipo_pago === 'solo_interes' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Solo Interés</span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pagado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {cuota.estado === 'pendiente' ? (
                              <button onClick={() => handleAbrirCobro(cuota)} className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-500 text-indigo-400 hover:text-white text-xs font-bold rounded border border-indigo-500/30 transition-all">Confirmar</button>
                            ) : (
                              <span className="text-zinc-600 font-bold text-lg">✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button onClick={() => setIsCuotasModalOpen(false)} className="px-6 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg">Cerrar Auditoría</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE INGRESO */}
      {isPagoModalOpen && selectedCuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isProcessingPago && setIsPagoModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Validar Ingreso a Cuenta</h2>
                <p className="text-xs text-zinc-400">Auditar cuota N° {selectedCuota.numero_cuota}</p>
              </div>
            </div>
            
            <form onSubmit={handleProcesarPagoSubmit}>
              <input type="hidden" name="cuota_id" value={selectedCuota.id} />
              <input type="hidden" name="prestamo_id" value={selectedCuota.prestamo_id} />
              
              <div className="p-6 space-y-5">
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Amort. Devuelta: S/ {selectedCuota.amortizacion_capital}</p>
                    <p className="text-xs text-indigo-400 font-medium">Mi Ganancia: S/ {(selectedCuota.interes * getRatio()).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Me Transfirieron</p>
                    <p className="text-xl font-bold text-emerald-400">S/ {(selectedCuota.amortizacion_capital + (selectedCuota.interes * getRatio())).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">¿Qué movimiento confirmó el Operador?</label>
                  <select name="tipo_pago" value={tipoPagoForm} onChange={(e) => setTipoPagoForm(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none">
                    <option value="completo">Recibí Completo (Capital + Mi Ganancia)</option>
                    <option value="solo_interes">Recibí Solo Interés (Se reenganchó en la calle)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha Real de Recepción en Cuenta</label>
                    <input type="date" name="fecha_pago_real" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
                <button type="button" disabled={isProcessingPago} onClick={() => setIsPagoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={isProcessingPago} className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all">
                  {isProcessingPago ? "Sincronizando..." : "Validar y Sincronizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}