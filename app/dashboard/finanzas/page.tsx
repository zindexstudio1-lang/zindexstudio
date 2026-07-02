"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getListaSocios } from "@/app/actions/users"; 
import BotonTerminos from "@/app/components/ui/BotonTerminos";
import ModalNuevoPrestamo from "@/app/components/ui/ModalNuevoPrestamo"; 
import { 
  getPrestamosActivos, 
  getCuotasPorPrestamo, 
  procesarPagoCuota,
  deletePrestamo,
  anularPagoCuota,
  editarPagoCuota
} from "@/app/actions/prestamos";

export default function FinanzasPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [socios, setSocios] = useState<any[]>([]);
  const [filtroOrigen, setFiltroOrigen] = useState("todos"); 

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
  const [cuotaToUndo, setCuotaToUndo] = useState<string | null>(null);

  const [prestamoToDelete, setPrestamoToDelete] = useState<string | null>(null);

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

  const prestamosFiltrados = prestamos.filter(p => {
    if (filtroOrigen === "todos") return true;
    return p.tipo_fondeo === filtroOrigen;
  });
  
 const prestamosActivos = prestamosFiltrados.filter(p => p.estado !== 'pagado');
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

  const generarMensajeWhatsApp = (clienteNombre: string, telefono: string, cuota: any) => {
    if (!telefono) {
      alert("⚠️ Este cliente no tiene un número de teléfono registrado.");
      return;
    }
  
   // --- NUEVA FUNCIÓN: ENVÍO DE CRONOGRAMA ---
  const enviarMensajeCronograma = (p: any) => {
    const link = `${window.location.origin}/cronograma/${p.id}`;
    const nombreCliente = (p.clientes as any)?.nombre || "Cliente";
    
    // Lee la plantilla del usuario que inició sesión
    const plantilla = currentUser?.user_metadata?.msgCronograma || "Hola *{{nombre}}*, tu crédito ha sido aprobado. Aquí tienes el link a tu cronograma digital: {{link}}";
    
    // Reemplaza las variables mágicas
    let mensajeTexto = plantilla
      .replace("{{nombre}}", nombreCliente)
      .replace("{{link}}", link);
      
    // Envía el mensaje
    const telefonoBruto = (p.clientes as any)?.telefono || "";
    let numLimpio = telefonoBruto.replace(/\D/g, '');
    if (numLimpio.length === 9) numLimpio = '51' + numLimpio; 
    
    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensajeTexto)}`;
    window.open(url, '_blank');
  };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(cuota.fecha_vencimiento + 'T12:00:00Z');
    vencimiento.setHours(0, 0, 0, 0);

    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const montoFmt = cuota.monto_total.toFixed(2);
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
      await refreshData();
    }
    setIsProcessingPago(false);
  };

  const handleEditPagoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingPago(true);
    const formData = new FormData(e.currentTarget);
    const result = await editarPagoCuota(formData);
    
    if (result?.error) {
      alert("Error: " + result.error); 
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
      setIsEditPagoModalOpen(false);
      await refreshData();
    }
    setIsProcessingPago(false);
  };

  // Esta función se activará cuando le den "Sí, Deshacer" en el nuevo diseño
  const confirmarDeshacer = async () => {
    if (!cuotaToUndo) return;
    setIsLoadingCuotas(true);
    
    const result = await anularPagoCuota(cuotaToUndo);
    
    if (result?.error) {
      alert("Error al deshacer: " + result.error);
    } else {
      const updatedCuotas = await getCuotasPorPrestamo(selectedPrestamo.id);
      setCuotasList(updatedCuotas);
      await refreshData(); // Tu refresh que acabas de agregar
    }
    
    setCuotaToUndo(null); // Oculta el diseño al terminar
    setIsLoadingCuotas(false);
  };

  const confirmarEliminacion = async () => {
    if (!prestamoToDelete) return;
    setIsLoadingTable(true);
    
    const result = await deletePrestamo(prestamoToDelete);
    if (result?.error) {
      alert("Error al eliminar: " + result.error);
    } else {
      await refreshData();
    }
    setPrestamoToDelete(null); // Esto cierra el modal
    setIsLoadingTable(false);
  };

  function enviarMensajeCronograma(p: any): void {
    const link = `${window.location.origin}/cronograma/${p.id}`;
    const nombreCliente = (p.clientes as any)?.nombre || "Cliente";
    const telefonoBruto = (p.clientes as any)?.telefono || "";

    if (!telefonoBruto) {
      alert("⚠️ Este cliente no tiene un número de teléfono registrado.");
      return;
    }

    const plantilla =
      currentUser?.user_metadata?.msgCronograma ||
      "Hola *{{nombre}}*, tu crédito ha sido aprobado. Aquí tienes el link a tu cronograma digital: {{link}}";

    const mensajeTexto = plantilla
      .replace("{{nombre}}", nombreCliente)
      .replace("{{link}}", link);

    let numLimpio = telefonoBruto.replace(/\D/g, "");
    if (numLimpio.length === 9) {
      numLimpio = `51${numLimpio}`;
    }

    if (!numLimpio) {
      alert("⚠️ No se pudo preparar el número de WhatsApp para este cliente.");
      return;
    }

    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensajeTexto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="p-4 md:p-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Préstamos y Capital</h1>
          <p className="text-sm text-zinc-400">Control de colocaciones, clientes y tablas de cuotas automatizadas.</p>
        </div>
        <button onClick={() => setIsNewLoanModalOpen(true)} className="self-start sm:self-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span>Estructurar Préstamo</span>
        </button>
      </div>

      <div className="flex space-x-2 border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        <button onClick={() => setFiltroOrigen("todos")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "todos" ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Cartera Global
        </button>
        <button onClick={() => setFiltroOrigen("propio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "propio" ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Mi Capital Propio
        </button>
        <button onClick={() => setFiltroOrigen("socio")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${filtroOrigen === "socio" ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
          Fondeos de Socios
        </button>
      </div>

      {isLoadingTable && <div className="text-zinc-500 text-center py-8">Sincronizando estados financieros...</div>}

      {!isLoadingTable && prestamosUnMes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 px-1">Préstamos Relámpago (Corto Plazo)</h2>
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
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {prestamosUnMes.map((p) => (
                    <tr key={p.id} className={`hover:bg-zinc-800/20 transition-all ${p.estado === 'pagado' ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{p.clientes?.nombre || "N/A"}</span>
                          {p.tipo_fondeo === 'socio' ? (
                            <span className="text-[10px] text-purple-400 mt-0.5 font-bold uppercase tracking-wider">Fondeado por Socio</span>
                          ) : (
                            <span className="text-[10px] text-blue-400 mt-0.5 font-bold uppercase tracking-wider">Capital Propio</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.clientes?.documento || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">S/ {p.monto_capital.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="font-medium text-indigo-300">{p.tipo_plazo === 'dias' ? `${p.plazo_meses} días` : `${p.plazo_meses} meses`}</span> / {p.tasa_interes}%
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.fecha_desembolso}</td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
  {p.estado === 'pagado' ? (
    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      Cancelado
    </span>
  ) : (
    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
      En Curso
    </span>
  )}
</td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleVerCuotas(p)} title="Ver Cronograma" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          
                          <BotonTerminos clienteNombre={(p.clientes as any)?.nombre} telefono={(p.clientes as any)?.telefono} />
                          
                          <button onClick={() => setPrestamoToDelete(p.id)} title="Eliminar Préstamo" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                          
                          <button 
                            onClick={() => enviarMensajeCronograma(p)} 
                            title="Enviar Link por WhatsApp" 
                            className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-md transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {prestamoToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPrestamoToDelete(null)}></div>
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-red-900/30 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold text-white mb-2">¿Eliminar Préstamo?</h2>
            <p className="text-sm text-zinc-400 mb-6">Esta acción borrará el préstamo y sus cuotas. Es irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setPrestamoToDelete(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
              <button onClick={confirmarEliminacion} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {!isLoadingTable && prestamosVariosMeses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 px-1">Préstamos a Plazos (2+ Meses)</h2>
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
                    <th className="px-6 py-4 font-semibold text-center">Estado</th>
                    <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {prestamosVariosMeses.map((p) => (
                    <tr key={p.id} className={`hover:bg-zinc-800/20 transition-all ${p.estado === 'pagado' ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{p.clientes?.nombre || "N/A"}</span>
                          {p.tipo_fondeo === 'socio' ? (
                            <span className="text-[10px] text-purple-400 mt-0.5 font-bold uppercase tracking-wider">Fondeado por Socio</span>
                          ) : (
                            <span className="text-[10px] text-blue-400 mt-0.5 font-bold uppercase tracking-wider">Capital Propio</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.clientes?.documento || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-emerald-400 font-medium whitespace-nowrap">S/ {p.monto_capital.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="font-medium text-zinc-300">{p.plazo_meses} meses</span> / {p.tasa_interes}%
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">{p.fecha_desembolso}</td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
  {p.estado === 'pagado' ? (
    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      Cancelado
    </span>
  ) : (
    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
      En Curso
    </span>
  )}
</td>

                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleVerCuotas(p)} title="Ver Cronograma" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          
                          <BotonTerminos clienteNombre={(p.clientes as any)?.nombre} telefono={(p.clientes as any)?.telefono} />
                          
                          <button onClick={() => setPrestamoToDelete(p.id)} title="Eliminar Préstamo" className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>

                         <button 
                            onClick={() => enviarMensajeCronograma(p)} 
                            title="Enviar Link por WhatsApp" 
                            className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-md transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
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

      {/* COMPONENTE INYECTADO */}
      <ModalNuevoPrestamo 
        isOpen={isNewLoanModalOpen} 
        onClose={() => setIsNewLoanModalOpen(false)} 
        onSuccess={refreshData} 
        currentUser={currentUser} 
        socios={socios} 
      />

      {isCuotasModalOpen && selectedPrestamo && !isPagoModalOpen && !isEditPagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCuotasModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Cronograma de Pagos</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Cliente: <span className="text-indigo-400 font-medium">{selectedPrestamo.clientes?.nombre}</span></p>
              </div>
              <button onClick={() => setIsCuotasModalOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-0 overflow-y-auto overflow-x-auto flex-1 bg-zinc-900/50 no-scrollbar">
              <table className="w-full text-sm text-zinc-400">
                <thead className="text-xs uppercase bg-zinc-950 text-zinc-500 sticky top-0 border-b border-zinc-800 z-10">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">N°</th>
                    <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Amortización</th>
                    <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Interés</th>
                    <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Cuota Total</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Vencimiento</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Estado</th>
                    <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {isLoadingCuotas ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center whitespace-nowrap">Cargando cronograma matemático...</td></tr>
                  ) : cuotasList.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center whitespace-nowrap">No hay cuotas registradas.</td></tr>
                  ) : (
                    cuotasList.map((cuota) => (
                      <tr key={cuota.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4 text-center font-medium text-white whitespace-nowrap">{cuota.numero_cuota}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">S/ {cuota.amortizacion_capital.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">S/ {cuota.interes.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400 whitespace-nowrap">S/ {cuota.monto_total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center text-zinc-300 whitespace-nowrap">{new Date(cuota.fecha_vencimiento + 'T12:00:00Z').toLocaleDateString('es-ES')} </td>
                        
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {cuota.estado === 'pendiente' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">Pendiente</span>
                          ) : cuota.tipo_pago === 'solo_interes' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Solo Interés</span>
                          ) : cuota.tipo_pago === 'mora' ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pagado +Mora</span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pagado</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {cuota.estado === 'pendiente' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => generarMensajeWhatsApp(selectedPrestamo.clientes?.nombre, selectedPrestamo.clientes?.telefono, cuota)}
                                title="Enviar recordatorio por WhatsApp"
                                className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded border border-[#25D366]/30 transition-all shadow-sm flex-shrink-0"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                </svg>
                              </button>
                              
                              <button onClick={() => handleAbrirCobro(cuota)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-bold rounded transition-colors border border-emerald-500/30 flex-shrink-0">
                                Cobrar
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 whitespace-nowrap">
                              <span className="text-emerald-400 font-bold text-sm capitalize">
                                ✓ {cuota.metodo_pago ? cuota.metodo_pago.replace('_', ' ') : 'Pagado'}
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => { setCuotaToEdit(cuota); setIsEditPagoModalOpen(true); }} className="text-[10px] font-medium text-blue-400/80 hover:text-blue-400 hover:underline transition-colors">Editar</button>
                                <span className="text-zinc-600 text-[10px]">|</span>
                                {/* Solo cambia el onClick de tu botón actual por este: */}
<button onClick={() => setCuotaToUndo(cuota.id)} className="text-[10px] font-medium text-red-400/80 hover:text-red-400 hover:underline transition-colors">
  Deshacer
</button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end flex-shrink-0">
              <button onClick={() => setIsCuotasModalOpen(false)} className="px-6 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">Cerrar Visor</button>
            </div>
          </div>
        </div>
      )}

      {isPagoModalOpen && selectedCuota && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isProcessingPago && setIsPagoModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <div>
                <h2 className="text-lg font-bold text-white">Registrar Recaudación</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Cuota N° {selectedCuota.numero_cuota}</p>
              </div>
            </div>
            
            <form onSubmit={handleProcesarPagoSubmit}>
              <input type="hidden" name="cuota_id" value={selectedCuota.id} />
              <input type="hidden" name="prestamo_id" value={selectedCuota.prestamo_id} />
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Modalidad Operativa</label>
                  <select name="tipo_pago" value={tipoPagoForm} onChange={(e) => setTipoPagoForm(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="completo">Pago Perfecto (Sin Mora)</option>
                    <option value="mora">Pago Retrasado (Aplicar Mora)</option>
                    <option value="solo_interes">Reenganche (Solo Interés - Empuja Capital)</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Canal de Recepción</label>
                  <select name="metodo_pago" required className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500">
                    <option value="efectivo">Efectivo Físico</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                    <option value="transferencia_bcp">Transferencia BCP</option>
                    <option value="transferencia_interbank">Transferencia Interbank</option>
                    <option value="transferencia_bbva">Transferencia BBVA</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {(tipoPagoForm === 'mora' || tipoPagoForm === 'solo_interes') && (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <label className="block text-xs font-medium text-amber-500 mb-1.5">Penalidad (S/)</label>
                      <input type="number" name="mora_aplicada" step="0.01" required placeholder="Ej. 20.00" className="w-full px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 outline-none" />
                    </div>
                  )}

                  <div className={tipoPagoForm === 'completo' ? 'col-span-2' : 'col-span-1'}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fecha de Ingreso a Caja</label>
                    <input type="date" name="fecha_pago_real" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none" />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
                <button type="button" disabled={isProcessingPago} onClick={() => setIsPagoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isProcessingPago} className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* NUEVO DISEÑO PARA DESHACER (Reemplaza al window.confirm) */}
      {cuotaToUndo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCuotaToUndo(null)}></div>
          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-amber-900/50 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">¿Deshacer Pago?</h2>
              <p className="text-sm text-zinc-400">La cuota volverá a estar Pendiente en el sistema.</p>
            </div>
            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
              <button onClick={() => setCuotaToUndo(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarDeshacer} className="flex-1 px-4 py-2.5 text-sm font-bold text-amber-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-lg shadow-amber-500/20">
                Sí, Deshacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
