"use client";

import { useState, useRef } from "react";
import { registrarPrestamo } from "@/app/actions/prestamos";

interface ModalNuevoPrestamoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: any;
  socios: any[];
}

export default function ModalNuevoPrestamo({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
  socios
}: ModalNuevoPrestamoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tipoFondeo, setTipoFondeo] = useState("propio");
  const [tipoPlazoFormulario, setTipoPlazoFormulario] = useState("meses");
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await registrarPrestamo(formData);

    if (result?.error) {
      alert("Error al estructurar: " + result.error);
      setIsLoading(false);
    } else if (result?.success) {
      formRef.current?.reset();
      setTipoFondeo("propio");
      setTipoPlazoFormulario("meses");
      setIsLoading(false);
      onSuccess(); // Esto le avisa al padre que recargue la tabla
      onClose();   // Esto cierra el modal
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isLoading && onClose()}></div>
      <div className="relative z-10 w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
          <h2 className="text-xl font-bold text-white">Estructuración de Nuevo Crédito</h2>
        </div>
        
        <form ref={formRef} onSubmit={handleSubmit}>
          <input type="hidden" name="admin_id" value={currentUser?.id || ""} />
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[65vh] overflow-y-auto">
            {/* LADO IZQUIERDO */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">Datos Identatarios del Cliente</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre Completo</label>
                <input type="text" name="nombre" required placeholder="Ej. Juan Pérez" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">DNI / RUC</label>
                <input type="text" name="documento" required placeholder="Ej. 74839201" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Teléfono</label>
                <input type="text" name="telefono" placeholder="Ej. 987654321" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
            </div>

            {/* LADO DERECHO */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider border-b border-zinc-800/60 pb-1">Condiciones del Crédito</h3>
              
              <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl mb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Origen del Capital</label>
                  <select name="tipo_fondeo" value={tipoFondeo} onChange={(e) => setTipoFondeo(e.target.value)} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="propio">Mi Capital (Ganancia 100%)</option>
                    <option value="socio">Capital de Socio / Inversionista</option>
                  </select>
                </div>

                {tipoFondeo === 'socio' && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Socio Inversionista</label>
                      <select name="inversionista_id" required className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500">
                        <option value="">Seleccionar socio...</option>
                        {socios.map((socio) => (
                          <option key={socio.id} value={socio.id} className="capitalize">{socio.email.split('@')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tasa a Pagar (%)</label>
                      <input type="number" name="tasa_inversionista" step="0.01" required defaultValue="10" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Capital</label>
                  <input type="number" name="monto_capital" step="0.01" required placeholder="0.00" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tasa (%)</label>
                  <input type="number" name="tasa_interes" step="0.01" required placeholder="0.00" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>
              </div>

              {/* SELECTOR MÁGICO: DÍAS O MESES */}
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
                <input type="date" name="fecha_desembolso" required className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-indigo-500 transition-colors uppercase text-xs" />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end gap-3">
            <button type="button" disabled={isLoading} onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
              {isLoading ? "Procesando Estructura..." : "Generar Cronograma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}