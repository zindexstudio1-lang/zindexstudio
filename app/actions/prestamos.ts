"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function registrarPrestamo(formData: FormData) {
  try {
    const adminId = formData.get("admin_id") as string;
    const nombreCliente = formData.get("nombre") as string;
    const documento = formData.get("documento") as string;
    const telefono = formData.get("telefono") as string;
    
    const montoCapital = parseFloat(formData.get("monto_capital") as string);
    const tasaInteres = parseFloat(formData.get("tasa_interes") as string);
    
    const tipoPlazo = formData.get("tipo_plazo") as string || "meses"; 
    const fechaDesembolsoStr = formData.get("fecha_desembolso") as string;
    
    const tipoFondeo = formData.get("tipo_fondeo") as string;
    const inversionistaId = formData.get("inversionista_id") as string || null;
    const tasaInversionista = parseFloat(formData.get("tasa_inversionista") as string);

    if (!adminId || !nombreCliente || !documento || !fechaDesembolsoStr) {
      return { error: "Todos los campos de identidad y fechas son completamente obligatorios." };
    }
    if (isNaN(montoCapital) || montoCapital <= 0) return { error: "Monto inválido." };
    if (isNaN(tasaInteres) || tasaInteres < 0) return { error: "Tasa inválida." };

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let plazoNum = 1;
    let diasExactos = 1;
    let fechaPagoCuota = new Date(fechaDesembolsoStr + 'T00:00:00Z');

    if (tipoPlazo === "dias") {
      const fechaLimiteStr = formData.get("fecha_limite") as string;
      if (!fechaLimiteStr) return { error: "Falta la fecha máxima de pago." };
      
      const d1 = new Date(fechaDesembolsoStr + 'T00:00:00Z');
      const d2 = new Date(fechaLimiteStr + 'T00:00:00Z');
      
      const diffTime = d2.getTime() - d1.getTime();
      diasExactos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diasExactos <= 0) return { error: "La fecha límite debe ser mayor al desembolso." };
      
      plazoNum = diasExactos; 
      fechaPagoCuota = d2;
    } else {
      plazoNum = parseInt(formData.get("plazo") as string);
      if (isNaN(plazoNum) || plazoNum <= 0) return { error: "Plazo en meses inválido." };
    }

    let clienteId = "";
    const { data: clienteExistente } = await supabaseAdmin.from("clientes").select("id").eq("admin_id", adminId).eq("documento", documento).single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente, error: clienteError } = await supabaseAdmin.from("clientes").insert({ admin_id: adminId, nombre: nombreCliente, documento, telefono }).select().single();
      if (clienteError) throw new Error("Error en Clientes: " + clienteError.message);
      clienteId = nuevoCliente.id;
    }

    const { data: prestamoData, error: prestamoError } = await supabaseAdmin.from("prestamos").insert({
      admin_id: adminId,
      cliente_id: clienteId,
      monto_capital: montoCapital,
      tasa_interes: tasaInteres,
      plazo_meses: plazoNum, 
      tipo_plazo: tipoPlazo,
      fecha_desembolso: fechaDesembolsoStr,
      estado: 'activo',
      tipo_fondeo: tipoFondeo,
      inversionista_id: inversionistaId,
      tasa_inversionista: isNaN(tasaInversionista) ? null : tasaInversionista
    }).select().single();
      
    if (prestamoError) throw new Error("Error al crear Contrato: " + prestamoError.message);

    const cuotasParaInsertar = [];
    let saldoRestante = montoCapital;

    if (tipoPlazo === "dias") {
      const interesTotal = parseFloat((montoCapital * (tasaInteres / 100) * (diasExactos / 30)).toFixed(2));
      const cuotaTotal = parseFloat((montoCapital + interesTotal).toFixed(2));

      cuotasParaInsertar.push({
        prestamo_id: prestamoData.id,
        numero_cuota: 1,
        amortizacion_capital: montoCapital,
        interes: interesTotal,
        monto_total: cuotaTotal,
        fecha_vencimiento: fechaPagoCuota.toISOString().split('T')[0],
        estado: 'pendiente'
      });
    } else {
      const fechaBase = new Date(fechaDesembolsoStr + 'T00:00:00Z');
      const amortizacionFijaBase = parseFloat((montoCapital / plazoNum).toFixed(2));
      
      for (let i = 1; i <= plazoNum; i++) {
        const fechaPagoCuotaIteracion = new Date(fechaBase);
        fechaPagoCuotaIteracion.setUTCMonth(fechaBase.getUTCMonth() + i);
        fechaPagoCuotaIteracion.setUTCDate(fechaPagoCuotaIteracion.getUTCDate() + 1);

        const interesMensual = parseFloat((saldoRestante * (tasaInteres / 100)).toFixed(2));
        const amortizacionCuota = i === plazoNum ? parseFloat(saldoRestante.toFixed(2)) : amortizacionFijaBase;
        const cuotaTotal = parseFloat((amortizacionCuota + interesMensual).toFixed(2));

        cuotasParaInsertar.push({
          prestamo_id: prestamoData.id,
          numero_cuota: i,
          amortizacion_capital: amortizacionCuota,
          interes: interesMensual,
          monto_total: cuotaTotal,
          fecha_vencimiento: fechaPagoCuotaIteracion.toISOString().split('T')[0],
          estado: 'pendiente'
        });
        saldoRestante = parseFloat((saldoRestante - amortizacionCuota).toFixed(2));
      }
    }

    const { error: cuotasError } = await supabaseAdmin.from("cuotas").insert(cuotasParaInsertar);
    if (cuotasError) throw new Error("Error insertar cuotas: " + cuotasError.message);

    return { success: true };
      
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error crítico en el servidor.";
    return { error: errorMsg };
  }
}

export async function getPrestamosActivos(adminId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await supabaseAdmin
    .from("prestamos")
    .select(`id, monto_capital, tasa_interes, plazo_meses, tipo_plazo, tipo_fondeo, fecha_desembolso, estado, created_at, clientes (nombre, documento, telefono)`)
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function deletePrestamo(prestamoId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { error } = await supabaseAdmin.from("prestamos").delete().eq("id", prestamoId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/finanzas");
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al eliminar el préstamo.";
    return { error: errorMsg };
  }
}

export async function getCuotasPorPrestamo(prestamoId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await supabaseAdmin.from("cuotas").select("*").eq("prestamo_id", prestamoId).order("numero_cuota", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function procesarPagoCuota(formData: FormData) {
  const cuotaId = formData.get("cuota_id") as string;
  const prestamoId = formData.get("prestamo_id") as string;
  const tipoPago = formData.get("tipo_pago") as string;
  const metodoPago = formData.get("metodo_pago") as string || "efectivo"; 
  const moraAplicada = parseFloat(formData.get("mora_aplicada") as string) || 0;
  const fechaPagoReal = formData.get("fecha_pago_real") as string;

  if (!cuotaId || !tipoPago || !fechaPagoReal) return { error: "Faltan datos obligatorios para procesar el pago." };
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { data: cuotaActual, error: errorCuota } = await supabaseAdmin.from("cuotas").select("*").eq("id", cuotaId).single();
    if (errorCuota || !cuotaActual) throw new Error("No se encontró la cuota a procesar.");

    if (tipoPago === 'completo' || tipoPago === 'mora') {
      const nuevoMontoTotal = cuotaActual.monto_total + moraAplicada;
      const { error: updateError } = await supabaseAdmin.from("cuotas").update({
        estado: 'pagado', fecha_pago_real: fechaPagoReal, mora_aplicada: moraAplicada, tipo_pago: tipoPago, metodo_pago: metodoPago, monto_total: parseFloat(nuevoMontoTotal.toFixed(2))
      }).eq("id", cuotaId);
      if (updateError) throw new Error("Error al registrar el pago: " + updateError.message);
    } 
    else if (tipoPago === 'solo_interes') {
      const numeroCuotaActual = cuotaActual.numero_cuota;
      const { data: cuotasFuturas } = await supabaseAdmin.from("cuotas").select("*").eq("prestamo_id", prestamoId).gt("numero_cuota", numeroCuotaActual).order("numero_cuota", { ascending: false });

      if (cuotasFuturas && cuotasFuturas.length > 0) {
        for (const cuotaFutura of cuotasFuturas) {
          const nuevaFecha = new Date(cuotaFutura.fecha_vencimiento);
          nuevaFecha.setUTCMonth(nuevaFecha.getUTCMonth() + 1);
          await supabaseAdmin.from("cuotas").update({ numero_cuota: cuotaFutura.numero_cuota + 1, fecha_vencimiento: nuevaFecha.toISOString().split('T')[0] }).eq("id", cuotaFutura.id);
        }
      }

      const fechaClon = new Date(cuotaActual.fecha_vencimiento);
      fechaClon.setUTCMonth(fechaClon.getUTCMonth() + 1);

      await supabaseAdmin.from("cuotas").insert({
        prestamo_id: prestamoId, numero_cuota: numeroCuotaActual + 1, amortizacion_capital: cuotaActual.amortizacion_capital, interes: cuotaActual.interes, monto_total: cuotaActual.amortizacion_capital + cuotaActual.interes, fecha_vencimiento: fechaClon.toISOString().split('T')[0], estado: 'pendiente'
      });

      const nuevoMontoTotal = cuotaActual.interes + moraAplicada;
      await supabaseAdmin.from("cuotas").update({
        estado: 'pagado', fecha_pago_real: fechaPagoReal, mora_aplicada: moraAplicada, tipo_pago: 'solo_interes', metodo_pago: metodoPago, amortizacion_capital: 0, monto_total: parseFloat(nuevoMontoTotal.toFixed(2))
      }).eq("id", cuotaId);
    }

    const { count } = await supabaseAdmin
      .from("cuotas")
      .select("*", { count: 'exact', head: true })
      .eq("prestamo_id", prestamoId)
      .eq("estado", "pendiente");

    if (count === 0) {
      await supabaseAdmin.from("prestamos").update({ estado: 'pagado' }).eq("id", prestamoId);
    }

    revalidatePath("/dashboard/finanzas");
    return { success: true };
  } catch (error: unknown) {  
    const errorMsg = error instanceof Error ? error.message : "Error interno al procesar la transacción.";
    return { error: errorMsg };
  }
}

export async function editarPagoCuota(formData: FormData) {
  const cuotaId = formData.get("cuota_id") as string;
  const metodoPago = formData.get("metodo_pago") as string;
  const fechaPagoReal = formData.get("fecha_pago_real") as string;

  if (!cuotaId || !metodoPago || !fechaPagoReal) return { error: "Faltan datos." };
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { error } = await supabaseAdmin.from("cuotas").update({
      metodo_pago: metodoPago,
      fecha_pago_real: fechaPagoReal
    }).eq("id", cuotaId);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard/inversionistas");
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al editar pago.";
    return { error: errorMsg };
  }
}

export async function getPrestamosComoInversionista(inversionistaId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabaseAdmin
    .from("prestamos")
    .select(`id, monto_capital, tasa_interes, tasa_inversionista, plazo_meses, tipo_plazo, fecha_desembolso, estado, admin_id, clientes (nombre, documento, telefono)`)
    .eq("inversionista_id", inversionistaId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function anularPagoCuota(cuotaId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { data: cuota } = await supabaseAdmin.from("cuotas").select("prestamo_id").eq("id", cuotaId).single();

    const { error } = await supabaseAdmin.from("cuotas").update({
      estado: 'pendiente', fecha_pago_real: null, mora_aplicada: 0, tipo_pago: null, metodo_pago: null
    }).eq("id", cuotaId);
    if (error) throw new Error(error.message);

    if (cuota) {
      await supabaseAdmin.from("prestamos").update({ estado: 'activo' }).eq("id", cuota.prestamo_id);
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al intentar deshacer el pago.";
    return { error: errorMsg };
  }
}

export async function getEstadisticasDashboard(userId: string, filtroOrigen: string = 'todos') {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: prestamosDb } = await supabaseAdmin.from("prestamos")
    .select("id, monto_capital, tasa_interes, tasa_inversionista, tipo_plazo, plazo_meses, tipo_fondeo, estado, admin_id, inversionista_id, clientes(nombre, telefono)")
    .or(`admin_id.eq.${userId},inversionista_id.eq.${userId}`);

  let prestamos = prestamosDb || [];

  if (filtroOrigen !== 'todos') {
      prestamos = prestamos.filter(p => p.tipo_fondeo === filtroOrigen);
  }

  if (prestamos.length === 0) {
    return { capitalColocado: 0, capitalRecuperado: 0, gananciaReal: 0, gananciaProyectada: 0, metodosPago: {}, totalPrestamos: 0, desgloseClientes: [], alertas: [] };
  }

  const prestamoIds = prestamos.map(p => p.id);

  const { data: cuotas } = await supabaseAdmin.from("cuotas")
    .select("id, amortizacion_capital, interes, estado, metodo_pago, prestamo_id, fecha_vencimiento, numero_cuota")
    .in("prestamo_id", prestamoIds);

  let capitalColocado = 0;
  let capitalRecuperado = 0;
  let gananciaReal = 0;
  let gananciaProyectadaTotal = 0;
  const metodosPago: Record<string, number> = { efectivo: 0, yape: 0, plin: 0, transferencia: 0 };

  const desgloseMap = new Map();
  const alertasCobro: Array<Record<string, unknown>> = []; 

  prestamos.forEach(p => {
     capitalColocado += p.monto_capital;
     const factorPlazo = p.tipo_plazo === 'dias' ? 1 : p.plazo_meses;
     const interesGlobalTotal = p.monto_capital * (p.tasa_interes / 100) * factorPlazo;
     const ratioInversionista = p.tasa_interes > 0 ? (p.tasa_inversionista / p.tasa_interes) : 0;
     
     let miGananciaProyectada = 0;
     if (p.inversionista_id === userId) miGananciaProyectada = interesGlobalTotal * ratioInversionista;
     else if (p.admin_id === userId) {
         if (p.tipo_fondeo === 'socio') miGananciaProyectada = interesGlobalTotal * (1 - ratioInversionista);
         else miGananciaProyectada = interesGlobalTotal;
     }

     gananciaProyectadaTotal += miGananciaProyectada;
     
     // Definimos un tipo seguro en línea para los clientes
     const clienteData = p.clientes as { nombre?: string, telefono?: string } | null;

     desgloseMap.set(p.id, {
         id: p.id,
         cliente: clienteData?.nombre || 'Cliente Desconocido',
         telefono: clienteData?.telefono || '',
         capital: p.monto_capital,
         gananciaProyectada: miGananciaProyectada,
         gananciaReal: 0,
         tipoFondeo: p.tipo_fondeo === 'socio' && p.admin_id === userId ? 'Dinero de Socio' : 'Mi Propio Dinero',
         estado: p.estado
     });
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  cuotas?.forEach(c => {
     const desglose = desgloseMap.get(c.prestamo_id);
     
     if (c.estado === 'pagado') {
        capitalRecuperado += c.amortizacion_capital;
        const p = prestamos.find(pr => pr.id === c.prestamo_id);
        if (p) {
           const ratioInversionista = p.tasa_interes > 0 ? (p.tasa_inversionista / p.tasa_interes) : 0;
           let miGananciaCuota = 0;
           if (p.inversionista_id === userId) miGananciaCuota = (c.interes * ratioInversionista);
           else if (p.admin_id === userId) {
              if (p.tipo_fondeo === 'socio') miGananciaCuota = (c.interes * (1 - ratioInversionista));
              else miGananciaCuota = c.interes;
           }
           gananciaReal += miGananciaCuota;
           if (desglose) desglose.gananciaReal += miGananciaCuota;
        }
        if (c.metodo_pago) {
           const m = c.metodo_pago.toLowerCase();
           if (m.includes('transferencia')) metodosPago['transferencia'] = (metodosPago['transferencia'] || 0) + 1;
           else metodosPago[m] = (metodosPago[m] || 0) + 1;
        }
     } else if (c.estado === 'pendiente') {
         const vencimiento = new Date(c.fecha_vencimiento + 'T12:00:00Z');
         vencimiento.setHours(0, 0, 0, 0);
         const diffTime = vencimiento.getTime() - hoy.getTime();
         const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

         if (diasRestantes <= 1) {
             alertasCobro.push({
                 cuota_id: c.id,
                 numero_cuota: c.numero_cuota,
                 diasRestantes: diasRestantes,
                 monto_total: c.amortizacion_capital + c.interes,
                 cliente_nombre: desglose?.cliente,
                 cliente_telefono: desglose?.telefono,
                 cuota_raw: { ...c, monto_total: c.amortizacion_capital + c.interes } 
             });
         }
     }
  });

  return {
     capitalColocado,
     capitalRecuperado,
     gananciaReal,
     gananciaProyectada: gananciaProyectadaTotal,
     metodosPago,
     totalPrestamos: prestamos.length,
     desgloseClientes: Array.from(desgloseMap.values()).sort((a, b) => b.gananciaProyectada - a.gananciaProyectada),
     alertas: alertasCobro.sort((a, b) => (a.diasRestantes as number) - (b.diasRestantes as number))
  };
}

export async function getPrestamoPublico(prestamoId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    const { data: prestamo, error: errorPrestamo } = await supabaseAdmin
      .from("prestamos")
      .select("id, monto_capital, tasa_interes, tipo_plazo, plazo_meses, fecha_desembolso, estado, clientes(nombre)")
      .eq("id", prestamoId)
      .single();
      
    if (errorPrestamo || !prestamo) return { error: "No se encontró el contrato." };
    
    const { data: cuotas, error: errorCuotas } = await supabaseAdmin
      .from("cuotas")
      .select("*")
      .eq("prestamo_id", prestamoId)
      .order("numero_cuota", { ascending: true });
      
    if (errorCuotas) return { error: "Error al cargar las cuotas." };
    
    return { prestamo, cuotas };
  } catch (error: unknown) {
    return { error: "Error de servidor al cargar el portal." };
  }
}

export async function getDatosExportacion(adminId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre, documento, telefono, prestamos(id)')
      .eq('admin_id', adminId);
      
    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error interno al exportar datos.";
    return { error: errorMsg };
  }
}