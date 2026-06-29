"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getDatosExportacion } from "@/app/actions/prestamos";

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isLoadingDatos, setIsLoadingDatos] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- DATOS GENERALES ---
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  
  // --- DATOS DE SEGURIDAD ---
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- DATOS DEL SISTEMA (ALERTAS Y WSP) ---
  const [diasAlerta, setDiasAlerta] = useState<number>(1);
  const [msgPreventivo, setMsgPreventivo] = useState("");
  const [msgHoy, setMsgHoy] = useState("");
  const [msgMora, setMsgMora] = useState("");

  // --- NUEVOS MENSAJES OPERATIVOS ---
  const [msgSimulacion, setMsgSimulacion] = useState("");
  const [msgPoliticas, setMsgPoliticas] = useState("");
  const [msgCronograma, setMsgCronograma] = useState("");

  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCorreo(user.email || "");
        const meta = user.user_metadata;
        setNombre(meta?.nombre || user.email?.split('@')[0] || "");
        
        setDiasAlerta(meta?.diasAlerta !== undefined ? meta.diasAlerta : 1);
        setMsgPreventivo(meta?.msgPreventivo || "Hola *{{nombre}}*,\nTe saludamos de *Z-Index Studio*.\n\nTe recordamos amablemente que tu cuota de *S/ {{monto}}* vence en {{dias}} días (el {{fecha}}).");
        setMsgHoy(meta?.msgHoy || "Hola *{{nombre}}*.\n\nTe informamos que tu cuota de *S/ {{monto}}* vence *HOY* ({{fecha}}). Tienes plazo hasta mañana para evitar mora.");
        setMsgMora(meta?.msgMora || "Hola *{{nombre}}*.\n\nTu cuota de *S/ {{monto}}* se encuentra *VENCIDA* por {{dias}} día(s).\n\nPor favor, regulariza tu pago.");

        // --- CARGAR NUEVOS MENSAJES ---
        // --- CARGAR NUEVOS MENSAJES OPERATIVOS ---
        
        setMsgSimulacion(meta?.msgSimulacion || `📄 Simulación de Crédito - Z-Index Studio

Hola {{nombre}}, tu financiamiento a plazos por S/ {{monto}} quedaría estructurado de la siguiente manera:

{{lista_cuotas}}

💰 Total a cancelar: S/ {{total}}

¡Cualquier consulta estamos a tu disposición!`);

        setMsgPoliticas(meta?.msgPoliticas || `Hola {{nombre}},
Te saludamos de Z-Index Studio.

Para garantizar la total transparencia de nuestras operaciones, te compartimos nuestros Términos y Condiciones. Puedes leerlos o descargarlos en el siguiente enlace:

📄 https://zindexstudio.vercel.app/Politicas.pdf

¡Cualquier duda estamos a tu disposición!`);

        setMsgCronograma(meta?.msgCronograma || `¡Hola! 📄 Aquí tienes tu acceso seguro para revisar el estado de tu financiamiento en tiempo real:

🔗 {{link}}

Guarda este enlace para consultar tus cuotas cuando lo necesites.`);

      }
      setIsLoadingDatos(false);
    }
    loadUserData();
  }, []);

  const handleActualizarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { nombre } });
    if (error) alert("Error al actualizar: " + error.message);
    else alert("¡Perfil actualizado con éxito!");
    setIsSaving(false);
  };

  const handleActualizarSistema = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ 

      data: { diasAlerta, msgPreventivo, msgHoy, msgMora, msgSimulacion, msgPoliticas, msgCronograma } 
    });
    if (error) alert("Error al guardar configuración: " + error.message);
    else alert("¡Motor de alertas y plantillas actualizados!");
    setIsSaving(false);
  };

  const handleActualizarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert("Las contraseñas no coinciden.");
    if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) alert("Error al cambiar contraseña: " + error.message);
    else {
      alert("¡Contraseña actualizada! Úsala en tu próximo inicio de sesión.");
      setPassword(""); setConfirmPassword("");
    }
    setIsSaving(false);
  };

  const handleExportarExcel = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida.");

      const response = await getDatosExportacion(user.id);
      if (response.error) throw new Error(response.error);

      const clientes = response.data;
      if (!clientes || clientes.length === 0) {
        alert("Aún no tienes clientes registrados para exportar.");
        setIsSaving(false);
        return;
      }

      let csv = "ID_Sistema,Nombre,Documento,Telefono,Contratos_Activos\n";
      clientes.forEach((c: any) => {
        csv += `${c.id},${c.nombre},${c.documento},${c.telefono || 'S/N'},${c.prestamos?.length || 0}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Backup_ZIndex_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Error al exportar datos: " + err.message);
    }
    setIsSaving(false);
  };

  if (isLoadingDatos) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 border-b border-zinc-800/80 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Configuración de Cuenta</h1>
        <p className="text-zinc-400 text-sm">Gestiona tus credenciales y preferencias del sistema Z-Index.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* === MENÚ LATERAL === */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 border-b md:border-b-0 border-zinc-800/50">
          <button onClick={() => setActiveTab("general")} className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === "general" ? "bg-indigo-500/10 text-indigo-400 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            Perfil General
          </button>
          <button onClick={() => setActiveTab("sistema")} className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === "sistema" ? "bg-emerald-500/10 text-emerald-400 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014-8.81c-2.24 2.133-3.27 4.983-3.27 8.81m0 0c0 3.827 1.03 6.677 3.27 8.81m-3.27-8.81a23.91 23.91 0 01-1.014 5.395m1.014-8.81c.273.805.47 1.65.59 2.52" /></svg>
            Sistema y Alertas
          </button>
          <button onClick={() => setActiveTab("seguridad")} className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === "seguridad" ? "bg-indigo-500/10 text-indigo-400 font-bold" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            Seguridad
          </button>
          <button onClick={() => setActiveTab("peligro")} className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${activeTab === "peligro" ? "bg-red-500/10 text-red-400 font-bold" : "text-zinc-400 hover:text-red-400 hover:bg-red-950/20"}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Zona Peligrosa
          </button>
        </div>

        {/* === CONTENIDO PRINCIPAL === */}
        <div className="flex-1 w-full">
          
          {/* ================= PESTAÑA 1: GENERAL ================= */}
          {activeTab === "general" && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-zinc-950/20">
                <h2 className="text-lg font-bold text-white">Perfil del Usuario</h2>
                <p className="text-sm text-zinc-500 mt-1">Personaliza cómo te ves dentro de la agencia.</p>
              </div>
              
              <form onSubmit={handleActualizarPerfil} className="p-6 md:p-8">
                
                {/* AVATAR A PRUEBA DE BALAS */}
                <div className="block sm:flex items-center text-center sm:text-left mb-8">
                  <div 
                    className="mx-auto sm:mx-0 sm:mr-6 mb-4 sm:mb-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold uppercase shadow-lg flex items-center justify-center text-3xl"
                    style={{ width: '80px', height: '80px', flexShrink: 0, minWidth: '80px', minHeight: '80px' }}
                  >
                    {nombre.charAt(0) || correo.charAt(0)}
                  </div>
                  <div className="overflow-hidden w-full">
                    <h3 className="text-white font-bold text-xl capitalize truncate">{nombre}</h3>
                    <p className="text-zinc-400 text-sm truncate">{correo}</p>
                  </div>
                </div>

                {/* CAJAS CON ANCHOS PORCENTUALES ESTRICTOS */}
                <div className="w-full pt-8 border-t border-zinc-800/50 block md:flex md:flex-row md:justify-between">
                  <div className="w-full md:w-[48%] mb-6 md:mb-0">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Alias a Mostrar</label>
                    <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" />
                  </div>
                  <div className="w-full md:w-[48%]">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Correo (Solo Lectura)</label>
                    <input type="email" disabled value={correo} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-500 cursor-not-allowed shadow-inner" />
                  </div>
                </div>
                
                <div className="pt-8 flex justify-end">
                  <button type="submit" disabled={isSaving} className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= PESTAÑA 2: SISTEMA Y ALERTAS ================= */}
          {activeTab === "sistema" && (
            <form onSubmit={handleActualizarSistema} className="space-y-8">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-zinc-950/20">
                  <h2 className="text-lg font-bold text-emerald-400">Motor de Alertas</h2>
                  <p className="text-sm text-zinc-500 mt-1">Configura con cuántos días de anticipación el Dashboard enciende la alarma de cobro.</p>
                </div>
                <div className="p-6 md:p-8">
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Días de Anticipación</label>
                  <div className="flex items-center gap-4">
                    <input type="number" min="0" max="30" value={diasAlerta} onChange={(e) => setDiasAlerta(Number(e.target.value))} className="w-24 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-emerald-500 text-center shadow-inner" />
                    <span className="text-sm text-zinc-400">días antes de la fecha de vencimiento.</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-zinc-950/20">
                  <h2 className="text-lg font-bold text-[#25D366]">Plantillas de WhatsApp</h2>
                  <p className="text-sm text-zinc-500 mt-1 leading-relaxed">Personaliza los mensajes automáticos. Usa <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#25D366]">{'{{nombre}}'}</code>, <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#25D366]">{'{{monto}}'}</code>, <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#25D366]">{'{{fecha}}'}</code> o <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#25D366]">{'{{dias}}'}</code> como variables mágicas.</p>
                </div>
                <div className="p-6 md:p-8 space-y-8">
                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-3 uppercase">1. Mensaje Preventivo (Aviso previo)</label>
                    <textarea rows={3} value={msgPreventivo} onChange={(e) => setMsgPreventivo(e.target.value)} className="w-full px-4 py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-[#25D366] resize-none shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-400 mb-3 uppercase">2. Mensaje de Vencimiento (El mismo día)</label>
                    <textarea rows={3} value={msgHoy} onChange={(e) => setMsgHoy(e.target.value)} className="w-full px-4 py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-[#25D366] resize-none shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-400 mb-3 uppercase">3. Mensaje de Mora (Días atrasados)</label>
                    <textarea rows={3} value={msgMora} onChange={(e) => setMsgMora(e.target.value)} className="w-full px-4 py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-[#25D366] resize-none shadow-inner" />
                  </div>

                  <div className="pt-6 border-t border-zinc-800/80">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">Mensajes Operativos (Inicio de Crédito)</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">A. Envío de Simulación</label>
                        <textarea rows={2} value={msgSimulacion} onChange={(e) => setMsgSimulacion(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-indigo-500 resize-none shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">B. Envío de Políticas</label>
                        <textarea rows={2} value={msgPoliticas} onChange={(e) => setMsgPoliticas(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-indigo-500 resize-none shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">C. Envío del Cronograma (Link)</label>
                        <textarea rows={2} value={msgCronograma} onChange={(e) => setMsgCronograma(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 outline-none focus:border-indigo-500 resize-none shadow-inner" />
                      </div>
                    </div>
                  </div>
                  
                </div>
                <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/20 flex justify-end">
                  <button type="submit" disabled={isSaving} className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                    {isSaving ? "Guardando..." : "Guardar Sistema"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================= PESTAÑA 3: SEGURIDAD ================= */}
          {activeTab === "seguridad" && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-zinc-950/20">
                <h2 className="text-lg font-bold text-white">Actualizar Credenciales</h2>
                <p className="text-sm text-zinc-500 mt-1">Mantén tu cuenta segura cambiando tu contraseña periódicamente.</p>
              </div>
              <form onSubmit={handleActualizarPassword} className="p-6 md:p-8">
                
                {/* INPUTS A PRUEBA DE BALAS */}
                <div className="w-full block md:flex md:flex-row md:justify-between">
                  <div className="w-full md:w-[48%] mb-6 md:mb-0">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Nueva Contraseña</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" />
                  </div>
                  <div className="w-full md:w-[48%]">
                    <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Confirmar Contraseña</label>
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner" />
                  </div>
                </div>

                <div className="pt-8 flex justify-end">
                  <button type="submit" disabled={isSaving || !password} className="w-full md:w-auto px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors border border-zinc-700 disabled:opacity-50">
                    {isSaving ? "Actualizando..." : "Actualizar Contraseña"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= PESTAÑA 4: ZONA PELIGROSA ================= */}
          {activeTab === "peligro" && (
            <div className="space-y-8">
              
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6 md:p-8 block md:flex md:flex-row md:justify-between md:items-center">
                  <div className="w-full md:w-[65%] mb-6 md:mb-0">
                    <h2 className="text-lg font-bold text-white mb-2">Respaldo de Base de Datos</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">Descarga un archivo CSV (formato Excel) con la lista completa de clientes registrados y la cantidad de préstamos activos.</p>
                  </div>
                  <div className="w-full md:w-[30%] flex justify-end">
                    <button onClick={handleExportarExcel} disabled={isSaving} className="w-full px-6 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-sm font-bold rounded-xl transition-all border border-blue-600/30 flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      Exportar Data
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-red-950/10 border border-red-900/30 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6 md:p-8 border-b border-red-900/30 bg-red-950/20">
                  <h2 className="text-lg font-bold text-red-400">Zona Restringida</h2>
                  <p className="text-sm text-red-400/70 mt-1">Opciones irreversibles. Procede con extrema precaución.</p>
                </div>
                <div className="p-6 md:p-8 block md:flex md:flex-row md:justify-between md:items-center">
                  <div className="w-full md:w-[65%] mb-6 md:mb-0">
                    <p className="text-base font-bold text-white mb-2">Desactivar mi cuenta</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">Perderás acceso al panel y no podrás visualizar ni cobrar cuotas. Los datos financieros históricos se mantendrán intactos.</p>
                  </div>
                  <div className="w-full md:w-[30%] flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => alert("Por seguridad financiera, contacta al Super Administrador para procesar la baja de un perfil.")}
                      className="w-full px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-sm font-bold rounded-xl transition-all border border-red-600/30 text-center"
                    >
                      Solicitar Baja
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          )}

        </div>
      </div>
    </div>
  );
}