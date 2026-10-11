"use client";

import { useEffect, useState, use } from "react"; 
import { getPrestamoPublico } from "@/app/actions/prestamos";

// Creamos los moldes exactos para los datos del portal
interface ICuotaPublica {
  id: string;
  estado: string;
  monto_total: number;
  fecha_vencimiento: string;
  numero_cuota: number;
  fecha_pago_real?: string | null;
}

interface IPrestamoPublico {
  clientes?: { nombre?: string };
}

interface IPortalData {
  prestamo: IPrestamoPublico;
  cuotas: ICuotaPublica[];
  error?: string;
}

export default function PortalClientePage({ params }: { params: Promise<{ id: string }> }) { 
  const { id } = use(params); 
  
  // Asignamos la interface al state
  const [data, setData] = useState<IPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const result = await getPrestamoPublico(id); 
      if (result.error) {
        setError(result.error);
      } else {
        // Casteamos el resultado a nuestra interface para que TS lo acepte
        setData(result as unknown as IPortalData);
      }
      setIsLoading(false);
    }
    loadData();
  }, [id]); 

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 font-medium animate-pulse">Cargando estado de cuenta...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-red-500/30 p-6 rounded-2xl text-center max-w-sm">
          <h2 className="text-xl font-bold text-white mb-2">Enlace Inválido</h2>
          <p className="text-zinc-400 text-sm">{error || "No pudimos encontrar este cronograma. Verifica que el link esté completo."}</p>
        </div>
      </div>
    );
  }

  const { prestamo, cuotas } = data;
  const clienteNombre = prestamo.clientes?.nombre || "Cliente";
  
  // Ahora TS ya sabe qué es "c" automáticamente
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagado').length;
  const totalCuotas = cuotas.length;
  const progreso = Math.round((cuotasPagadas / totalCuotas) * 100);
  
  const totalDeuda = cuotas.reduce((acc, c) => acc + c.monto_total, 0);
  const totalPagado = cuotas.filter(c => c.estado === 'pagado').reduce((acc, c) => acc + c.monto_total, 0);
  const saldoPendiente = totalDeuda - totalPagado;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 pb-12 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* HEADER CORPORATIVO */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">Z</div>
            <span className="font-bold text-white tracking-tight">Laboriano Capital <span className="text-indigo-400 font-normal">Studio</span></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
            Portal Seguro
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* SALUDO Y RESUMEN */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white capitalize mb-1">Hola, {clienteNombre.split(' ')[0]}</h1>
          <p className="text-sm text-zinc-500">Este es el estado actualizado de tu financiamiento.</p>
        </div>

        {/* TARJETAS DE RESUMEN */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Financiado</p>
            <p className="text-xl font-bold text-white">S/ {totalDeuda.toFixed(2)}</p>
          </div>
          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider mb-1">Saldo Pendiente</p>
            <p className="text-xl font-bold text-indigo-400">S/ {saldoPendiente.toFixed(2)}</p>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Progreso de Pagos</p>
              <p className="text-sm font-medium text-white">{cuotasPagadas} de {totalCuotas} cuotas canceladas</p>
            </div>
            <span className="text-xl font-bold text-emerald-400">{progreso}%</span>
          </div>
          <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out" style={{ width: `${progreso}%` }}></div>
          </div>
        </div>

        {/* LISTA DE CUOTAS */}
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 px-1">Cronograma Detallado</h2>
        
        <div className="space-y-3">
          {cuotas.map((cuota) => {
            const isPagado = cuota.estado === 'pagado';
            const vencimiento = new Date(cuota.fecha_vencimiento + 'T12:00:00Z');
            const fechaFmt = vencimiento.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Lógica para saber si está vencida HOY o antes
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            vencimiento.setHours(0,0,0,0);
            const isVencida = !isPagado && vencimiento < hoy;

            return (
              <div key={cuota.id} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                isPagado ? 'bg-emerald-950/20 border-emerald-900/30' : 
                isVencida ? 'bg-red-950/20 border-red-900/30' : 
                'bg-zinc-900 border-zinc-800'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isPagado ? 'bg-emerald-500/10 text-emerald-500' :
                    isVencida ? 'bg-red-500/10 text-red-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {cuota.numero_cuota}
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-white">S/ {cuota.monto_total.toFixed(2)}</p>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Vence: {fechaFmt}</p>
                  </div>
                </div>

                <div className="text-right">
                  {isPagado ? (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Pagado</span>
                      {cuota.fecha_pago_real && (
                        <span className="text-[10px] text-zinc-600 mt-1">el {new Date(cuota.fecha_pago_real + 'T12:00:00Z').toLocaleDateString('es-ES')}</span>
                      )}
                    </div>
                  ) : isVencida ? (
                    <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">Vencida</span>
                  ) : (
                    <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendiente</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center pb-8 border-t border-zinc-900 pt-6">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-2">Gestión Financiera Confiable</p>
          <div className="flex items-center justify-center gap-1.5 opacity-50">
             <div className="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center text-[8px] font-bold text-white">Z</div>
             <span className="text-xs font-bold text-zinc-500">-Index Studio</span>
          </div>
        </div>

      </div>
    </div>
  );
}