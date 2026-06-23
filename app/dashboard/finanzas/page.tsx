"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getListaSocios } from "@/app/actions/users"; 
import { 
  registrarPrestamo, 
  getPrestamosActivos, 
  getCuotasPorPrestamo, 
  procesarPagoCuota,
  deletePrestamo 
} from "@/app/actions/prestamos";

export default function FinanzasPage() {
  // 1. ESTADOS GLOBALES
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  
  // 2. ESTADOS: NUEVO PRÉSTAMO
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoFondeo, setTipoFondeo] = useState("propio");
  const [socios, setSocios] = useState<any[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  // 3. ESTADOS: VISOR DE CUOTAS
  const [isCuotasModalOpen, setIsCuotasModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<any>(null);
  const [cuotasList, setCuotasList] = useState<any[]>([]);
  const [isLoadingCuotas, setIsLoadingCuotas] = useState(false);

  // 4. ESTADOS: MOTOR DE RECAUDACIÓN (COBROS)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<any>(null);
  const [isProcessingPago, setIsProcessingPago] = useState(false);
  const [tipoPagoForm, setTipoPagoForm] = useState("completo");

  // 5. ESTADO: ELIMINAR PRÉSTAMO
  const [prestamoToDelete, setPrestamoToDelete] = useState<string | null>(null);

  // INICIALIZACIÓN
  useEffect(() => {
    async function initData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const [prestamosData, sociosData] = await Promise.all([
          getPrestamosActivos(user.id),
          getListaSocios()
        ]);
        setPrestamos(prestamosData);
        setSocios(sociosData);
        setIsLoadingTable(false);
      }
    }
    initData();
  }, []);

  const refreshData = async () => {
    if (currentUser) {
      const data = await getPrestamosActivos(currentUser.id);
      setPrestamos(data);
    }
  };

  // MANEJADOR: CREAR PRÉSTAMO
  const handleCreatePrestamo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await registrarPrestamo(formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
      setIsErrorModalOpen(true);
    } else if (result.success) {
      formRef.current?.reset();
      await refreshData();
      setIsLoading(false);
      setIsNewLoanModalOpen(false);
      setTipoFondeo("propio"); 
    }
  };

  // MANEJADOR: VER CRONOGRAMA
  const handleVerCuotas = async (prestamo: any) => {
    setSelectedPrestamo(prestamo);
    setIsCuotasModalOpen(true);
    setIsLoadingCuotas(true);
    
    const data = await getCuotasPorPrestamo(prestamo.id);
    setCuotasList(data);
    setIsLoadingCuotas(false);
  };

  // MANEJADORES: COBROS (MOTOR DE RECAUDACIÓN)
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
      alert("Conflicto financiero: " + result.error); 
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
      setIsPagoModalOpen(false);
    }
    setIsProcessingPago(false);
  };

  // MANEJADOR: CONFIRMAR ELIMINACIÓN
  const confirmarEliminacion = async () => {
    if (!prestamoToDelete) return;
    setIsLoadingTable(true);
    setPrestamoToDelete(null); // Cerramos el modal
    
    const result = await deletePrestamo(prestamoToDelete);
    if (result?.error) {
      alert("Error al eliminar: " + result.error);
    } else {
      await refreshData();
    }
    setIsLoadingTable(false);
  };

  return (
    <div className="p-4 md:p-8 relative">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Préstamos y Capital</h1>
          <p className="text-sm text-zinc-400">Control de colocaciones, clientes y tablas de cuotas automatizadas.</p>
        </div>
        
        <button 
          onClick={() => setIsNewLoanModalOpen(true)}
          className="self-start sm:self-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Estructurar Préstamo</span>
        </button>
      </div>

      {/* TABLA PRINCIPAL DE PRÉSTAMOS ACTIVOS */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-zinc-950/50 text-zinc-500 border-b border-zinc-800/80">
              <tr>
                <th className="px-6 py-4 font-semibold text-left">Cliente</th>
                <th className="px-6 py-4 font-semibold text-center">Documento</th>
                <th className="px-6 py-4 font-semibold text-center">Capital Colocado</th>
                <th className="px-6 py-4 font-semibold text-center">Plazo / Interés</th>
                <th className="px-6 py-4 font-semibold text-center">Desembolso</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {isLoadingTable && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    Sincronizando estados financieros...
                  </td>
                </tr>
              )}
              {!isLoadingTable && prestamos.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    {p.clientes?.nombre || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {p.clientes?.documento || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">
                    S/ {p.monto_capital.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {p.plazo_meses} meses / {p.tasa_interes}%
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {p.fecha_desembolso}
                  </td>
                  
                  {/* ACCIONES: OJO Y TACHITO */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleVerCuotas(p)}
                        title="Ver Cronograma" 
                        className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-md transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>

                      <button 
                        onClick={() => setPrestamoToDelete(p.id)}
                        title="Eliminar Préstamo" 
                        className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
              {!isLoadingTable && prestamos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No se registran colocaciones activas de capital.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: NUEVO PRÉSTAMO */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isLoading && setIsNewLoanModalOpen(false)}></div>
          
          <div className="relative z-10 w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
              <h2 className="text-xl font-bold text-white">Estructuración de Nuevo Crédito</h2>
              <p className="text-sm text-zinc-400 mt-1">Lógica transaccional basada en amortización progresiva alemana.</p>
            </div>
            
            <form ref={formRef} onSubmit={handleCreatePrestamo}>
              <input type="hidden" name="admin_id" value={currentUser?.id || ""} />
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[65vh] overflow-y-auto">
                
                {/* Bloque Izquierdo: Cliente */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">
                    Datos Identatarios del Cliente
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre Completo o Razón Social</label>
                    <input type="text" name="nombre" required placeholder="Ej. Juan Pérez Ramos" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Documento de Identidad (DNI / RUC)</label>
                    <input type="text" name="documento" required placeholder="Ej. 74839201" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Teléfono de Contacto</label>
                    <input type="text" name="telefono" placeholder="Ej. 987654321" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Bloque Derecho: Condiciones y Fondeo */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">
                    Condiciones del Crédito
                  </h3>
                  
                  {/* Selector de Fondeo Dinámico */}
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl mb-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Origen del Capital</label>
                      <select 
                        name="tipo_fondeo" 
                        value={tipoFondeo}
                        onChange={(e) => setTipoFondeo(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="propio">Mi Capital (Ganancia 100%)</option>
                        <option value="socio">Capital de Socio / Inversionista</option>
                      </select>
                    </div>

                    {tipoFondeo === 'socio' && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Socio Inversionista</label>
                          <select name="inversionista_id" required className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500">
                            <option value="">Seleccionar socio...</option>
                            {socios.map((socio) => (
                              <option key={socio.id} value={socio.id} className="capitalize">
                                {socio.email.split('@')[0]} — Rol: {socio.role.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tasa a Pagar (%)</label>
                          <input 
                            type="number" 
                            name="tasa_inversionista" 
                            step="0.01" 
                            required 
                            defaultValue="10" 
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Monto del Capital Colocado</label>
                    <div className="relative rounded-lg">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-zinc-500 text-sm font-medium">S/</span>
                      </div>
                      <input type="number" name="monto_capital" step="0.01" required placeholder="0.00" className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tasa de Interés Mensual</label>
                    <div className="relative rounded-lg">
                      <input type="number" name="tasa_interes" step="0.01" required placeholder="0.00" className="w-full pl-4 pr-9 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-zinc-500 text-sm font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plazo de Devolución (Meses)</label>
                    <input type="number" name="plazo_meses" required placeholder="Ej. 12" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha Oficial de Desembolso</label>
                    <input type="date" name="fecha_desembolso" required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors uppercase text-xs" />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end gap-3">
                <button type="button" disabled={isLoading} onClick={() => setIsNewLoanModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isLoading ? "Procesando Estructura..." : "Generar Cronograma"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADVERTENCIA ROJO (Errores de Servidor) */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsErrorModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-red-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-red-950/20">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20">
              <div className="flex items-center gap-3 text-red-400 mb-2">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-lg font-bold text-white">Conflicto Financiero Detectado</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-mono text-xs break-words">{errorMessage}</div>
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
              <button onClick={() => setIsErrorModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">Corregir Datos</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VISOR DE CRONOGRAMA */}
      {isCuotasModalOpen && selectedPrestamo && !isPagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCuotasModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Cronograma de Pagos</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Cliente: <span className="text-indigo-400 font-medium">{selectedPrestamo.clientes?.nombre}</span></p>
              </div>
              <button onClick={() => setIsCuotasModalOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-zinc-900/50">
              <table className="w-full text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-950 text-zinc-500 sticky top-0 border-b border-zinc-800 z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center">N°</th>
                    <th className="px-6 py-4 font-semibold text-right">Amortización</th>
                    <th className="px-6 py-4 font-semibold text-right">Interés</th>
                    <th className="px-6 py-4 font-semibold text-right">Cuota Total</th>
                    <th className="px-6 py-4 font-semibold text-center">Vencimiento</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                    <th className="px-6 py-4 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {isLoadingCuotas ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">Cargando cronograma matemático...</td></tr>
                  ) : cuotasList.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">No hay cuotas registradas.</td></tr>
                  ) : (
                    cuotasList.map((cuota) => (
                      <tr key={cuota.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4 text-center font-medium text-white">{cuota.numero_cuota}</td>
                        <td className="px-6 py-4 text-right">S/ {cuota.amortizacion_capital.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">S/ {cuota.interes.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400">S/ {cuota.monto_total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center text-zinc-300">{new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
                        
                        <td className="px-6 py-4 text-center">
                          {cuota.estado === 'pendiente' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                              Pendiente
                            </span>
                          ) : cuota.tipo_pago === 'solo_interes' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                              Solo Interés
                            </span>
                          ) : cuota.tipo_pago === 'mora' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Pagado +Mora
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Pagado
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {cuota.estado === 'pendiente' ? (
                            <button 
                              onClick={() => handleAbrirCobro(cuota)}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-bold rounded transition-colors border border-emerald-500/30"
                            >
                              Cobrar
                            </button>
                          ) : (
                            <span className="text-zinc-600 font-bold text-lg">✓</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button onClick={() => setIsCuotasModalOpen(false)} className="px-6 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MOTOR DE RECAUDACIÓN (COBROS Y REENGANCHES) */}
      {isPagoModalOpen && selectedCuota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isProcessingPago && setIsPagoModalOpen(false)}></div>
          
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/20">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Registrar Recaudación</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Cuota N° {selectedCuota.numero_cuota} • Vencimiento: {new Date(selectedCuota.fecha_vencimiento).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
            
            <form onSubmit={handleProcesarPagoSubmit}>
              <input type="hidden" name="cuota_id" value={selectedCuota.id} />
              <input type="hidden" name="prestamo_id" value={selectedCuota.prestamo_id} />
              
              <div className="p-6 space-y-5">
                
                {/* Desglose de Montos */}
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Amortización: S/ {selectedCuota.amortizacion_capital}</p>
                    <p className="text-xs text-zinc-500">Interés: S/ {selectedCuota.interes}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Monto Base</p>
                    <p className="text-xl font-bold text-white">S/ {selectedCuota.monto_total}</p>
                  </div>
                </div>

                {/* Modalidad de Pago */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Modalidad Operativa</label>
                  <select 
                    name="tipo_pago" 
                    value={tipoPagoForm}
                    onChange={(e) => setTipoPagoForm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="completo">Pago Perfecto (Sin Mora)</option>
                    <option value="mora">Pago Retrasado (Aplicar Mora)</option>
                    <option value="solo_interes">Reenganche (Solo Interés - Empuja Capital)</option>
                  </select>
                </div>

                {/* Condicionales Dinámicos */}
                <div className="grid grid-cols-2 gap-4">
                  {(tipoPagoForm === 'mora' || tipoPagoForm === 'solo_interes') && (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <label className="block text-xs font-medium text-amber-500 mb-1.5">Penalidad / Mora (S/)</label>
                      <input 
                        type="number" 
                        name="mora_aplicada" 
                        step="0.01" 
                        required 
                        placeholder="Ej. 20.00" 
                        className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 outline-none focus:border-amber-500" 
                      />
                    </div>
                  )}

                  <div className={tipoPagoForm === 'completo' ? 'col-span-2' : 'col-span-1'}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha de Ingreso a Caja</label>
                    <input 
                      type="date" 
                      name="fecha_pago_real" 
                      required 
                      defaultValue={new Date().toISOString().split('T')[0]} 
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                {/* Alerta de Impacto en Base de Datos para Reenganche */}
                {tipoPagoForm === 'solo_interes' && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-in slide-in-from-top-2">
                    <p className="text-xs text-indigo-300 leading-relaxed">
                      <strong>Reenganche detectado:</strong> El sistema cobrará el interés hoy. La cuota actual se clonará para el próximo mes y todo el cronograma restante se empujará un mes hacia adelante. ¡Rentabilidad protegida!
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
                <button type="button" disabled={isProcessingPago} onClick={() => setIsPagoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isProcessingPago} className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50">
                  {isProcessingPago ? "Procesando..." : "Confirmar Recepción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRMACIÓN DE ELIMINACIÓN (Z-INDEX PREMIUM) */}
      {prestamoToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPrestamoToDelete(null)}></div>
          
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-red-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold text-white">¿Anular Contrato?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Estás a punto de eliminar este préstamo y todo su cronograma matemático. Esta acción es irreversible. ¿Deseas continuar?
              </p>
            </div>
            
            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
              <button 
                onClick={() => setPrestamoToDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminacion}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-lg shadow-red-600/20"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}