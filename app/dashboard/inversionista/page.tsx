"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getListaSocios } from "@/app/actions/users"; 
import { 
  getPrestamosComoInversionista, 
  getCuotasPorPrestamo, 
  procesarPagoCuota,
  registrarPrestamo,
  anularPagoCuota,
  deletePrestamo,
  editarPagoCuota
} from "@/app/actions/prestamos";

export default function InversionistasPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [todosLosSocios, setTodosLosSocios] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tipoPlazoFormulario, setTipoPlazoFormulario] = useState("meses");
  const formRef = useRef<HTMLFormElement>(null);

  const [isCuotasModalOpen, setIsCuotasModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<any>(null);
  const [cuotasList, setCuotasList] = useState<any[]>([]);
  const [isLoadingCuotas, setIsLoadingCuotas] = useState(false);
  
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<any>(null);
  const [isProcessingPago, setIsProcessingPago] = useState(false);
  const [tipoPagoForm, setTipoPagoForm] = useState("completo");

  const [isEditPagoModalOpen, setIsEditPagoModalOpen] = useState(false);
  const [cuotaToEdit, setCuotaToEdit] = useState<any>(null);

  const [prestamoToDelete, setPrestamoToDelete] = useState<string | null>(null);

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

        setTodosLosSocios(sociosLista);

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

  const refreshData = async () => {
    if (currentUser) {
      const prestamosInv = await getPrestamosComoInversionista(currentUser.id);
      setPrestamos(prestamosInv);
      
      const uniqueAdminIds = Array.from(new Set(prestamosInv.map(p => p.admin_id)));
      const ops = uniqueAdminIds.map(adminId => {
        const socio = todosLosSocios.find(s => s.id === adminId);
        return {
          id: adminId as string,
          nombre: socio ? socio.email.split('@')[0] : 'Operador Externo'
        };
      });
      setOperadores(ops);
      if (!activeTab && ops.length > 0) setActiveTab(ops[0].id);
    }
  };

  const handleCreatePrestamo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const result = await registrarPrestamo(formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsCreating(false);
      setIsErrorModalOpen(true);
    } else if (result.success) {
      formRef.current?.reset();
      await refreshData();
      setIsCreating(false);
      setIsNewLoanModalOpen(false);
      setTipoPlazoFormulario("meses");
    }
  };

  const confirmarEliminacion = async () => {
    if (!prestamoToDelete) return;
    setIsLoading(true);
    setPrestamoToDelete(null); 
    
    const result = await deletePrestamo(prestamoToDelete);
    if (result?.error) {
      alert("Error al eliminar: " + result.error);
    } else {
      await refreshData();
    }
    setIsLoading(false);
  };

  // DIVISIONES INTELIGENTES
  const prestamosActivos = prestamos.filter(p => p.admin_id === activeTab);
  const prestamosUnMes = prestamosActivos.filter(p => p.tipo_plazo === 'dias' || p.plazo_meses <= 1);
  const prestamosVariosMeses = prestamosActivos.filter(p => p.tipo_plazo !== 'dias' && p.plazo_meses > 1);

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

  const handleEditPagoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingPago(true);
    const formData = new FormData(e.currentTarget);
    const result = await editarPagoCuota(formData);
    
    if (result?.error) {
      alert("Error al editar: " + result.error); 
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
      setIsEditPagoModalOpen(false);
    }
    setIsProcessingPago(false);
  };

  const handleAnularPago = async (cuotaId: string) => {
    if (!window.confirm("¿Estás seguro de deshacer este pago? La cuota volverá a estar Pendiente.")) return;
    
    setIsLoadingCuotas(true);
    const result = await anularPagoCuota(cuotaId);
    
    if (result?.error) {
      alert("Error al deshacer: " + result.error);
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
    }
    setIsLoadingCuotas(false);
  };

  const getRatio = () => selectedPrestamo?.tasa_interes > 0 ? (selectedPrestamo.tasa_inversionista / selectedPrestamo.tasa_interes) : 0;

  // GENERADOR DE MENSAJES DE WHATSAPP AUTOMÁTICOS (PARA EDWIN)
  const generarMensajeWhatsApp = (clienteNombre: string, telefono: string, cuota: any) => {
    if (!telefono) {
      alert("⚠️ Este cliente no tiene un número de teléfono registrado.");
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(cuota.fecha_vencimiento + 'T12:00:00Z');
    vencimiento.setHours(0, 0, 0, 0);

    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Edwin cobra su capital + su ganancia de inversionista
    const interesSocio = cuota.interes * getRatio();
    const totalSocio = cuota.amortizacion_capital + interesSocio;
    const montoFmt = totalSocio.toFixed(2);
    const fechaFmt = vencimiento.toLocaleDateString('es-ES');
    
    let mensajeTexto = "";
    let emojiHex = ""; 

    if (diasRestantes > 1) {
      emojiHex = "%F0%9F%91%8B"; 
      mensajeTexto = ` Hola *${clienteNombre}*,\nTe saludamos de *Z-Index Studio*.\n\nTe recordamos amablemente que tu cuota de *S/ ${montoFmt}* vence en ${diasRestantes} días (el ${fechaFmt}).\n\n¡Gracias por tu puntualidad!`;
    } else if (diasRestantes === 1 || diasRestantes === 0) {
      emojiHex = "%E2%9A%A0%EF%B8%8F"; 
      mensajeTexto = ` Hola *${clienteNombre}*.\n\nTe informamos que tu cuota de *S/ ${montoFmt}* vence *HOY* (${fechaFmt}).\n\nTienes plazo máximo para cancelar hasta mañana para evitar recargos por mora.\n\n¡Quedamos atentos a tu envío!`;
    } else {
      const diasAtraso = Math.abs(diasRestantes);
      emojiHex = "%F0%9F%9A%A8"; 
      mensajeTexto = ` Hola *${clienteNombre}*.\n\nNos comunicamos para informarte que tu cuota de *S/ ${montoFmt}* se encuentra *VENCIDA* por ${diasAtraso} día(s).\n\nPor favor, regulariza tu pago lo antes posible para evitar mayores penalidades en el sistema.`;
    }

    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.length === 9) numLimpio = '51' + numLimpio; 

    const textoFinal = emojiHex + encodeURIComponent(mensajeTexto);
    const url = `https://wa.me/${numLimpio}?text=${textoFinal}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8 relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Central de Auditoría</h1>
          <p className="text-sm text-zinc-400">Control maestro de capitales fondeados y rendimientos por operador.</p>
        </div>
        
        <button 
          onClick={() => setIsNewLoanModalOpen(true)}
          className="self-start sm:self-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Estructurar Fondeo</span>
        </button>
      </div>

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

      {isLoading && <div className="text-zinc-500 text-center py-8">Cargando carteras...</div>}

      {/* SECCIÓN 1: PRÉSTAMOS RÁPIDOS */}
      {!isLoading && prestamosUnMes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 px-1">Retornos Relámpago (Corto Plazo)</h2>
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
                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {prestamosUnMes.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{p.clientes?.nombre || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">S/ {p.monto_capital.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-zinc-500">
                        <span className="font-medium text-indigo-300">
                          {p.tipo_plazo === 'dias' ? `${p.plazo_meses} días` : `${p.plazo_meses} meses`}
                        </span> / {p.tasa_interes}%
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-bold text-indigo-400">{p.tasa_inversionista}%</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.fecha_desembolso}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleVerCuotas(p)} title="Auditar Cronograma" className="p-1.5 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          <button onClick={() => setPrestamoToDelete(p.id)} title="Eliminar Contrato" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: PRÉSTAMOS A PLAZOS */}
      {!isLoading && prestamosVariosMeses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 px-1">Retornos a Mediano/Largo Plazo (2+ Meses)</h2>
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
                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {prestamosVariosMeses.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{p.clientes?.nombre || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">S/ {p.monto_capital.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap text-zinc-500">
                        <span className="font-medium text-zinc-300">{p.plazo_meses} meses</span> / {p.tasa_interes}%
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap font-bold text-indigo-400">{p.tasa_inversionista}%</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.fecha_desembolso}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleVerCuotas(p)} title="Auditar Cronograma" className="p-1.5 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          <button onClick={() => setPrestamoToDelete(p.id)} title="Eliminar Contrato" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!isLoading && prestamosActivos.length === 0 && (
        <div className="text-zinc-500 text-center py-8">Esta cartera no tiene clientes activos.</div>
      )}

      {/* MODAL NUEVO FONDEO */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isCreating && setIsNewLoanModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
              <h2 className="text-xl font-bold text-white">Estructurar Nuevo Fondeo</h2>
            </div>
            
            <form ref={formRef} onSubmit={handleCreatePrestamo}>
              <input type="hidden" name="inversionista_id" value={currentUser?.id || ""} />
              <input type="hidden" name="tipo_fondeo" value="socio" />
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[65vh] overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">Datos del Cliente Final</h3>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre Completo</label>
                    <input type="text" name="nombre" required placeholder="Ej. César Gómez" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Documento de Identidad</label>
                    <input type="text" name="documento" required placeholder="Ej. 74839201" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Teléfono de Contacto</label>
                    <input type="text" name="telefono" placeholder="Ej. 987654321" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">Condiciones del Fondeo</h3>
                  
                  <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl mb-4">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Operador de Calle (Responsable)</label>
                    <select name="admin_id" required className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 capitalize">
                      <option value="">Seleccionar operador...</option>
                      {todosLosSocios.filter(s => s.id !== currentUser?.id).map((socio) => (
                        <option key={socio.id} value={socio.id}>{socio.email.split('@')[0]} — {socio.role.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Capital Fondeado</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-zinc-500 text-sm">S/</span></div>
                      <input type="number" name="monto_capital" step="0.01" required className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tasa Global (Calle)</label>
                      <input type="number" name="tasa_interes" step="0.01" required placeholder="Ej. 20" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-indigo-400 mb-1.5">Mi Tasa (Neta)</label>
                      <input type="number" name="tasa_inversionista" step="0.01" required placeholder="Ej. 10" className="w-full px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm text-indigo-300 outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo de Plazo</label>
                      <select name="tipo_plazo" value={tipoPlazoFormulario} onChange={(e) => setTipoPlazoFormulario(e.target.value)} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors">
                        <option value="meses">Meses (Alemán)</option>
                        <option value="dias">Días (Relámpago)</option>
                      </select>
                    </div>
                    {tipoPlazoFormulario === 'dias' ? (
                      <div className="animate-in fade-in zoom-in duration-200">
                        <label className="block text-xs font-bold text-amber-400 mb-1.5">Fecha Límite Pago</label>
                        <input type="date" name="fecha_limite" required className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400 outline-none focus:border-amber-500 uppercase" />
                      </div>
                    ) : (
                      <div className="animate-in fade-in zoom-in duration-200">
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plazo (Meses)</label>
                        <input type="number" name="plazo" required placeholder="Ej. 4" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha Oficial de Desembolso</label>
                    <input type="date" name="fecha_desembolso" required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500 uppercase" />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end gap-3">
                <button type="button" disabled={isCreating} onClick={() => setIsNewLoanModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={isCreating} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2">
                  {isCreating ? "Procesando..." : "Registrar Fondeo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVERTENCIA DE ERROR */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsErrorModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-red-900/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20"><h2 className="text-lg font-bold text-red-400">Error</h2></div>
            <div className="p-6 text-sm text-red-400">{errorMessage}</div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
              <button onClick={() => setIsErrorModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* VISOR DE CRONOGRAMA */}
      {isCuotasModalOpen && selectedPrestamo && !isPagoModalOpen && !isEditPagoModalOpen && (
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
                    <th className="px-6 py-4 font-semibold text-right">Dev. Capital</th>
                    <th className="px-6 py-4 font-semibold text-right text-indigo-400">Mi Ganancia</th>
                    <th className="px-6 py-4 font-semibold text-right text-emerald-400">Total a Recibir</th>
                    <th className="px-6 py-4 font-semibold text-center">Vencimiento</th>
                    <th className="px-6 py-4 font-semibold text-center">Estado (Calle)</th>
                    <th className="px-6 py-4 font-semibold text-center">Auditar Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {isLoadingCuotas ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center">Calculando matemática...</td></tr>
                  ) : (
                    cuotasList.map((cuota) => {
                      const interesSocio = cuota.interes * getRatio();
                      const totalSocio = cuota.amortizacion_capital + interesSocio;

                      return (
                        <tr key={cuota.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-6 py-4 text-center font-medium text-white">{cuota.numero_cuota}</td>
                          <td className="px-6 py-4 text-right">S/ {cuota.amortizacion_capital.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-medium text-indigo-300">S/ {interesSocio.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-400">S/ {totalSocio.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-zinc-300">{new Date(cuota.fecha_vencimiento + 'T12:00:00Z').toLocaleDateString('es-ES')} </td>
                          
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
                              <div className="flex items-center justify-center gap-2">
                                {/* BOTÓN DE WHATSAPP PARA EDWIN */}
                                <button 
                                  onClick={() => generarMensajeWhatsApp(selectedPrestamo.clientes?.nombre, selectedPrestamo.clientes?.telefono, cuota)}
                                  title="Enviar recordatorio por WhatsApp"
                                  className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded border border-[#25D366]/30 transition-all shadow-sm"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                  </svg>
                                </button>
                                
                                <button onClick={() => handleAbrirCobro(cuota)} className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-500 text-indigo-400 hover:text-white text-xs font-bold rounded border border-indigo-500/30 transition-all">
                                  Confirmar
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-emerald-400 font-bold text-sm capitalize">
                                  ✓ {cuota.metodo_pago ? cuota.metodo_pago.replace('_', ' ') : 'Pagado'}
                                </span>
                                <div className="flex gap-2">
                                  <button onClick={() => { setCuotaToEdit(cuota); setIsEditPagoModalOpen(true); }} className="text-[10px] font-medium text-blue-400/80 hover:text-blue-400 hover:underline transition-colors">Editar</button>
                                  <span className="text-zinc-600 text-[10px]">|</span>
                                  <button onClick={() => handleAnularPago(cuota.id)} className="text-[10px] font-medium text-red-400/80 hover:text-red-400 hover:underline transition-colors">Deshacer</button>
                                </div>
                              </div>
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

                <div className="mt-4 mb-4">
                  <label className="block text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Canal de Recepción</label>
                  <select name="metodo_pago" required className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500 transition-colors">
                    <option value="efectivo">Efectivo Físico</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                    <option value="transferencia_bcp">Transferencia BCP</option>
                    <option value="transferencia_interbank">Transferencia Interbank</option>
                    <option value="transferencia_bbva">Transferencia BBVA</option>
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

      {/* MODAL EDITAR DETALLES DE PAGO */}
      {isEditPagoModalOpen && cuotaToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isProcessingPago && setIsEditPagoModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.81.933a.75.75 0 01-.95-.95l.933-2.81a4.5 4.5 0 011.14-1.89l13.614-13.614z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Corregir Recaudación</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Cuota N° {cuotaToEdit.numero_cuota}</p>
              </div>
            </div>
            
            <form onSubmit={handleEditPagoSubmit}>
              <input type="hidden" name="cuota_id" value={cuotaToEdit.id} />
              
              <div className="p-6 space-y-5">
                <p className="text-xs text-blue-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">Aquí puedes corregir el canal por donde te pagaron o la fecha. Si lo que necesitas es cambiar de Pago Completo a Solo Interés (o viceversa), por favor usa el botón "Deshacer" en la tabla.</p>
                
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Canal Correcto de Recepción</label>
                  <select name="metodo_pago" required defaultValue={cuotaToEdit.metodo_pago || 'efectivo'} className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500 transition-colors">
                    <option value="efectivo">Efectivo Físico</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                    <option value="transferencia_bcp">Transferencia BCP</option>
                    <option value="transferencia_interbank">Transferencia Interbank</option>
                    <option value="transferencia_bbva">Transferencia BBVA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha Real de Ingreso</label>
                  <input type="date" name="fecha_pago_real" required defaultValue={cuotaToEdit.fecha_pago_real || ''} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
                <button type="button" disabled={isProcessingPago} onClick={() => setIsEditPagoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isProcessingPago} className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR CONTRATO */}
      {prestamoToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPrestamoToDelete(null)}></div>
          
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-red-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-red-900/20">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">¿Anular Fondeo?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Estás a punto de eliminar este contrato y todas sus cuotas. Esta acción es irreversible. ¿Deseas continuar?
              </p>
            </div>
            
            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
              <button onClick={() => setPrestamoToDelete(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
                Cancelar
              </button>
              <button onClick={confirmarEliminacion} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-600/20">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}