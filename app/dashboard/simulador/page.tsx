"use client";

import { useState, useMemo, useEffect } from "react";

export default function SimuladorPage() {
  const [tipoPlazo, setTipoPlazo] = useState<"meses" | "dias">("meses");
  const [monto, setMonto] = useState<number>(600);
  const [tasa, setTasa] = useState<number>(10);
  const [plazo, setPlazo] = useState<number>(6);
  
  // Fechas
  const [fechaDesembolso, setFechaDesembolso] = useState<string>("");
  const [fechaLimite, setFechaLimite] = useState<string>("");
  const [telefonoCliente, setTelefonoCliente] = useState<string>("");

  // Inicializar fechas por defecto (Hoy y Mañana)
  useEffect(() => {
    const hoy = new Date();
    setFechaDesembolso(hoy.toISOString().split('T')[0]);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 15); // Por defecto 15 días para la muestra
    setFechaLimite(manana.toISOString().split('T')[0]);
  }, []);

  // MOTOR MATEMÁTICO (Dual: Alemán vs Días)
  const cronograma = useMemo(() => {
    if (monto <= 0 || tasa < 0 || !fechaDesembolso) return [];

    // LÓGICA 1: PRÉSTAMO RELÁMPAGO (DÍAS)
    if (tipoPlazo === "dias") {
      if (!fechaLimite) return [];
      const d1 = new Date(fechaDesembolso + 'T00:00:00Z');
      const d2 = new Date(fechaLimite + 'T00:00:00Z');
      
      const diffTime = d2.getTime() - d1.getTime();
      const diasExactos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diasExactos <= 0) return []; // La fecha límite debe ser mayor al desembolso

      const interesTotal = parseFloat((monto * (tasa / 100) * (diasExactos / 30)).toFixed(2));
      const cuotaTotal = parseFloat((monto + interesTotal).toFixed(2));

      return [{
        numero: 1,
        amortizacion: monto,
        interes: interesTotal,
        total: cuotaTotal,
        saldoMuerte: 0,
        fecha: fechaLimite,
        detalleDias: diasExactos
      }];
    } 
    
    // LÓGICA 2: PRÉSTAMO A PLAZOS (MÉTODO ALEMÁN)
    else {
      if (plazo <= 0) return [];
      let cuotas = [];
      let saldoRestante = monto;
      const amortizacionFijaBase = parseFloat((monto / plazo).toFixed(2));
      const fechaBase = new Date(fechaDesembolso + 'T00:00:00Z');

      for (let i = 1; i <= plazo; i++) {
        let fechaPago = new Date(fechaBase);
        fechaPago.setUTCMonth(fechaBase.getUTCMonth() + i);
        fechaPago.setUTCDate(fechaPago.getUTCDate() + 1); // Día de gracia

        const interesMensual = parseFloat((saldoRestante * (tasa / 100)).toFixed(2));
        let amortizacionCuota = i === plazo ? parseFloat(saldoRestante.toFixed(2)) : amortizacionFijaBase;
        const cuotaTotal = parseFloat((amortizacionCuota + interesMensual).toFixed(2));

        cuotas.push({
          numero: i,
          amortizacion: amortizacionCuota,
          interes: interesMensual,
          total: cuotaTotal,
          saldoMuerte: parseFloat((saldoRestante - amortizacionCuota).toFixed(2)),
          fecha: fechaPago.toISOString().split('T')[0]
        });

        saldoRestante = parseFloat((saldoRestante - amortizacionCuota).toFixed(2));
      }
      return cuotas;
    }
  }, [monto, tasa, plazo, fechaDesembolso, fechaLimite, tipoPlazo]);

  const totales = cronograma.reduce(
    (acc, c) => {
      acc.interes += c.interes;
      acc.total += c.total;
      return acc;
    },
    { interes: 0, total: 0 }
  );

  // GENERADOR DE REPORTE PARA WHATSAPP
  const enviarWhatsApp = () => {
    let numLimpio = telefonoCliente.replace(/\D/g, '');
    if (numLimpio.length > 0 && numLimpio.length === 9) numLimpio = '51' + numLimpio;
    
    let mensaje = `📄 *Simulación de Crédito - Z-Index Studio*\n\n`;
    
    if (tipoPlazo === "dias" && cronograma.length > 0) {
        mensaje += `Hola, tu financiamiento relámpago por *S/ ${monto.toFixed(2)}* (a ${(cronograma[0] as any).detalleDias} días) quedaría estructurado de la siguiente manera:\n\n`;
    } else {
        mensaje += `Hola, tu financiamiento a plazos por *S/ ${monto.toFixed(2)}* quedaría estructurado de la siguiente manera:\n\n`;
    }
    
    cronograma.forEach(c => {
        const fechaFmt = new Date(c.fecha + 'T12:00:00Z').toLocaleDateString('es-ES');
        mensaje += `🗓️ *Cuota ${c.numero}* (${fechaFmt}): S/ ${c.total.toFixed(2)}\n`;
    });

    mensaje += `\n💰 *Total a cancelar:* S/ ${totales.total.toFixed(2)}\n\n`;
    mensaje += `¡Cualquier consulta estamos a tu disposición!`;

    const url = numLimpio 
      ? `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`; 
      
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Simulador de Créditos</h1>
        <p className="text-zinc-400 text-sm">Calcula cronogramas exactos (Mensual o Relámpago por días) para enviarlos a tus prospectos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: CONTROLES */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            
            {/* SELECTOR DE TIPO DE PRÉSTAMO */}
            <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 mb-6">
              <button 
                onClick={() => setTipoPlazo("meses")}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${tipoPlazo === 'meses' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                A Plazos (Mensual)
              </button>
              <button 
                onClick={() => setTipoPlazo("dias")}
                className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${tipoPlazo === 'dias' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Relámpago (Días)
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Monto de Capital (S/)</label>
                <input 
                  type="number" 
                  value={monto} 
                  onChange={(e) => setMonto(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {tipoPlazo === "meses" && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Plazo (Meses)</label>
                    <input 
                      type="number" 
                      value={plazo} 
                      onChange={(e) => setPlazo(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                )}
                <div className={tipoPlazo === "dias" ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tasa {tipoPlazo === "meses" ? "Mensual" : "Base (30 días)"} (%)</label>
                  <input 
                    type="number" 
                    value={tasa} 
                    onChange={(e) => setTasa(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Fecha Supuesta de Desembolso</label>
                <input 
                  type="date" 
                  value={fechaDesembolso} 
                  onChange={(e) => setFechaDesembolso(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all [color-scheme:dark]"
                />
              </div>

              {tipoPlazo === "dias" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-medium text-emerald-400 mb-1">Fecha Límite de Pago</label>
                  <input 
                    type="date" 
                    value={fechaLimite} 
                    onChange={(e) => setFechaLimite(e.target.value)}
                    className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-300 focus:border-emerald-500 outline-none transition-all [color-scheme:dark]"
                  />
                  {cronograma.length > 0 && (
                     <p className="text-[10px] text-zinc-500 mt-1.5 text-right">
                       Plazo exacto calculado: <span className="font-bold text-emerald-400">{(cronograma[0] as any).detalleDias} días</span>
                     </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CAJA DE WHATSAPP (Rediseño Minimalista) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Exportar Propuesta</h3>
              <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </div>
            <p className="text-xs text-zinc-500 mb-5">Envía el detalle de cuotas directamente al cliente.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">N° WhatsApp (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: 999888777" 
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all"
                />
              </div>
              
              <button 
                onClick={enviarWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-zinc-950 border border-[#25D366]/30 hover:border-[#25D366] font-bold py-2.5 rounded-lg transition-all"
              >
                Enviar Propuesta
              </button>
            </div>
          </div>        </div>
        {/* PANEL DERECHO: RESULTADOS Y CRONOGRAMA */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-center">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Capital a Entregar</p>
                <p className="text-xl font-bold text-white">S/ {monto.toFixed(2)}</p>
             </div>
             <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-xl p-5 text-center">
                <p className="text-xs font-medium text-indigo-400 uppercase mb-1">Interés Generado</p>
                <p className="text-xl font-bold text-indigo-400">S/ {totales.interes.toFixed(2)}</p>
             </div>
             <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-xl p-5 text-center">
                <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Retorno Total</p>
                <p className="text-xl font-bold text-emerald-400">S/ {totales.total.toFixed(2)}</p>
             </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm text-zinc-400">
                <thead className="text-[10px] uppercase bg-zinc-950/80 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center">N°</th>
                    <th className="px-6 py-4 font-semibold text-left">Fecha de Pago</th>
                    <th className="px-6 py-4 font-semibold text-center">Amortización</th>
                    <th className="px-6 py-4 font-semibold text-center">Interés</th>
                    <th className="px-6 py-4 font-semibold text-right text-emerald-500">Cuota Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {cronograma.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        {tipoPlazo === 'dias' ? 'Selecciona una fecha límite posterior al desembolso.' : 'Ingresa los parámetros para ver el cronograma.'}
                      </td>
                    </tr>
                  ) : (
                    cronograma.map((c) => (
                      <tr key={c.numero} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-zinc-500">{c.numero}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                          {new Date(c.fecha + 'T12:00:00Z').toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 text-center text-zinc-300">S/ {c.amortizacion.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center text-indigo-400/80">S/ {c.interes.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400 bg-emerald-500/5">S/ {c.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}