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
    const plazoMeses = parseInt(formData.get("plazo_meses") as string);
    const fechaDesembolsoStr = formData.get("fecha_desembolso") as string;

    const tipoFondeo = formData.get("tipo_fondeo") as string;
    const inversionistaId = formData.get("inversionista_id") as string || null;
    const tasaInversionista = parseFloat(formData.get("tasa_inversionista") as string);

    if (!adminId || !nombreCliente || !documento || !fechaDesembolsoStr) {
      return { error: "Todos los campos de identidad y fechas son completamente obligatorios." };
    }
    if (isNaN(montoCapital) || montoCapital <= 0) {
      return { error: "El monto del capital debe ser un número mayor a cero." };
    }
    if (isNaN(tasaInteres) || tasaInteres < 0) {
      return { error: "La tasa de interés no puede ser un valor negativo." };
    }
    if (isNaN(plazoMeses) || plazoMeses <= 0) {
      return { error: "El plazo en meses debe ser un número entero mayor a cero." };
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // LÓGICA ANTIDUPLICADOS: Buscar o crear cliente
    let clienteId = "";
    
    const { data: clienteExistente } = await supabaseAdmin
      .from("clientes")
      .select("id")
      .eq("admin_id", adminId)
      .eq("documento", documento)
      .single();

    if (clienteExistente) {
      // Si el cliente ya existe en tu base de datos, reutilizamos su ID
      clienteId = clienteExistente.id;
    } else {
      // Si no existe, lo creamos nuevo
      const { data: nuevoCliente, error: clienteError } = await supabaseAdmin
        .from("clientes")
        .insert({ admin_id: adminId, nombre: nombreCliente, documento, telefono })
        .select()
        .single();

      if (clienteError) throw new Error("Error en Clientes: " + clienteError.message);
      clienteId = nuevoCliente.id;
    }

    // Guardar el Préstamo vinculándolo al cliente correcto
    const { data: prestamoData, error: prestamoError } = await supabaseAdmin
      .from("prestamos")
      .insert({
        admin_id: adminId,
        cliente_id: clienteId,
        monto_capital: montoCapital,
        tasa_interes: tasaInteres,
        plazo_meses: plazoMeses,
        fecha_desembolso: fechaDesembolsoStr,
        estado: 'activo',
        tipo_fondeo: tipoFondeo,
        inversionista_id: inversionistaId,
        tasa_inversionista: isNaN(tasaInversionista) ? null : tasaInversionista
      })
      .select()
      .single();
      
    if (prestamoError) throw new Error("Error al crear el Contrato: " + prestamoError.message);

    // Generación del Cronograma
    const cuotasParaInsertar = [];
    const amortizacionFijaBase = parseFloat((montoCapital / plazoMeses).toFixed(2));
    let saldoRestante = montoCapital;
    let fechaPagoCuota = new Date(fechaDesembolsoStr);

    for (let i = 1; i <= plazoMeses; i++) {
      fechaPagoCuota.setUTCMonth(fechaPagoCuota.getUTCMonth() + 1);
      const interesMensual = parseFloat((saldoRestante * (tasaInteres / 100)).toFixed(2));
      
      let amortizacionCuota = amortizacionFijaBase;
      if (i === plazoMeses) {
        amortizacionCuota = parseFloat(saldoRestante.toFixed(2));
      }

      const cuotaTotal = parseFloat((amortizacionCuota + interesMensual).toFixed(2));

      cuotasParaInsertar.push({
        prestamo_id: prestamoData.id,
        numero_cuota: i,
        amortizacion_capital: amortizacionCuota,
        interes: interesMensual,
        monto_total: cuotaTotal,
        fecha_vencimiento: fechaPagoCuota.toISOString().split('T')[0],
        estado: 'pendiente'
      });

      saldoRestante = parseFloat((saldoRestante - amortizacionCuota).toFixed(2));
    }

    const { error: cuotasError } = await supabaseAdmin.from("cuotas").insert(cuotasParaInsertar);
    if (cuotasError) throw new Error("Error masivo al insertar cuotas: " + cuotasError.message);

    revalidatePath("/dashboard/finanzas");
    return { success: true };
    
  } catch (error: any) {
    return { error: error.message || "Error crítico inesperado en el servidor." };
  }
}

export async function getPrestamosActivos(adminId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("prestamos")
    .select(`
      id,
      monto_capital,
      tasa_interes,
      plazo_meses,
      fecha_desembolso,
      estado,
      created_at,
      clientes (
        nombre,
        documento
      )
    `)
    .eq("admin_id", adminId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al traer préstamos:", error);
    return [];
  }
  return data || [];
}

export async function deletePrestamo(prestamoId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabaseAdmin.from("prestamos").delete().eq("id", prestamoId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/finanzas");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al eliminar el préstamo." };
  }
}

export async function getCuotasPorPrestamo(prestamoId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("cuotas")
    .select("*")
    .eq("prestamo_id", prestamoId)
    .order("numero_cuota", { ascending: true });

  if (error) {
    console.error("Error al traer cuotas:", error);
    return [];
  }
  return data || [];
}

// LÓGICA DE RECAUDACIÓN ACTUALIZADA (REENGANCHE REAL)
export async function procesarPagoCuota(formData: FormData) {
  const cuotaId = formData.get("cuota_id") as string;
  const prestamoId = formData.get("prestamo_id") as string;
  const tipoPago = formData.get("tipo_pago") as string;
  const moraAplicada = parseFloat(formData.get("mora_aplicada") as string) || 0;
  const fechaPagoReal = formData.get("fecha_pago_real") as string;

  if (!cuotaId || !tipoPago || !fechaPagoReal) {
    return { error: "Faltan datos obligatorios para procesar el pago." };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: cuotaActual, error: errorCuota } = await supabaseAdmin
      .from("cuotas")
      .select("*")
      .eq("id", cuotaId)
      .single();

    if (errorCuota || !cuotaActual) throw new Error("No se encontró la cuota a procesar.");

    // ESCENARIO A: PAGO COMPLETO O CON MORA
    if (tipoPago === 'completo' || tipoPago === 'mora') {
      const nuevoMontoTotal = cuotaActual.monto_total + moraAplicada;
      const { error: updateError } = await supabaseAdmin
        .from("cuotas")
        .update({
          estado: 'pagado',
          fecha_pago_real: fechaPagoReal,
          mora_aplicada: moraAplicada,
          tipo_pago: tipoPago,
          monto_total: parseFloat(nuevoMontoTotal.toFixed(2))
        })
        .eq("id", cuotaId);

      if (updateError) throw new Error("Error al registrar el pago: " + updateError.message);
    } 
    
    // ESCENARIO B: REENGANCHE (CONGELAR CAPITAL Y EMPUJAR CRONOGRAMA)
    else if (tipoPago === 'solo_interes') {
      const numeroCuotaActual = cuotaActual.numero_cuota;

      // 1. Traer cuotas futuras ordenadas de mayor a menor para empujarlas sin conflictos
      const { data: cuotasFuturas } = await supabaseAdmin
        .from("cuotas")
        .select("*")
        .eq("prestamo_id", prestamoId)
        .gt("numero_cuota", numeroCuotaActual)
        .order("numero_cuota", { ascending: false });

      // 2. Empujar cuotas futuras +1 mes y +1 número
      if (cuotasFuturas && cuotasFuturas.length > 0) {
        for (const cuotaFutura of cuotasFuturas) {
          const nuevaFecha = new Date(cuotaFutura.fecha_vencimiento);
          nuevaFecha.setUTCMonth(nuevaFecha.getUTCMonth() + 1);

          await supabaseAdmin.from("cuotas").update({
            numero_cuota: cuotaFutura.numero_cuota + 1,
            fecha_vencimiento: nuevaFecha.toISOString().split('T')[0]
          }).eq("id", cuotaFutura.id);
        }
      }

      // 3. Clonar la cuota actual intacta para el próximo mes
      const fechaClon = new Date(cuotaActual.fecha_vencimiento);
      fechaClon.setUTCMonth(fechaClon.getUTCMonth() + 1);

      await supabaseAdmin.from("cuotas").insert({
        prestamo_id: prestamoId,
        numero_cuota: numeroCuotaActual + 1,
        amortizacion_capital: cuotaActual.amortizacion_capital,
        interes: cuotaActual.interes,
        monto_total: cuotaActual.amortizacion_capital + cuotaActual.interes,
        fecha_vencimiento: fechaClon.toISOString().split('T')[0],
        estado: 'pendiente'
      });

      // 4. Actualizar la cuota actual marcándola como 'Solo Interés'
      const nuevoMontoTotal = cuotaActual.interes + moraAplicada;
      await supabaseAdmin.from("cuotas").update({
        estado: 'pagado',
        fecha_pago_real: fechaPagoReal,
        mora_aplicada: moraAplicada,
        tipo_pago: 'solo_interes',
        amortizacion_capital: 0, 
        monto_total: parseFloat(nuevoMontoTotal.toFixed(2))
      }).eq("id", cuotaId);
    }

    revalidatePath("/dashboard/finanzas");
    return { success: true };

  } catch (error: any) {
    return { error: error.message || "Error interno al procesar la transacción." };
  }
}

// NUEVA FUNCIÓN: TRAER CARTERA PARA EL PANEL DEL INVERSIONISTA
export async function getPrestamosComoInversionista(inversionistaId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from("prestamos")
    .select(`
      id,
      monto_capital,
      tasa_interes,
      tasa_inversionista,
      plazo_meses,
      fecha_desembolso,
      estado,
      admin_id,
      clientes (
        nombre,
        documento
      )
    `)
    .eq("inversionista_id", inversionistaId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al traer cartera del inversionista:", error);
    return [];
  }
  
  return data || [];
}