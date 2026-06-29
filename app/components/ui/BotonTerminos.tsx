"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface BotonTerminosProps {
  clienteNombre: string;
  telefono: string;
  urlPdf?: string; 
}

export default function BotonTerminos({ 
  clienteNombre, 
  telefono, 
  urlPdf = "https://zindexstudio.vercel.app/Politicas.pdf" 
}: BotonTerminosProps) {
  
  // Plantilla por defecto en caso de que no haya guardado nada aún
  const [plantilla, setPlantilla] = useState(`Hola {{nombre}},
Te saludamos de Z-Index Studio.

Para garantizar la total transparencia de nuestras operaciones, te compartimos nuestros Términos y Condiciones. Puedes leerlos o descargarlos en el siguiente enlace:

📄 ${urlPdf}

¡Cualquier duda estamos a tu disposición!`);

  // El cerebro que lee tu perfil en tiempo real
  useEffect(() => {
    async function getPlantilla() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.user_metadata?.msgPoliticas) {
        setPlantilla(user.user_metadata.msgPoliticas);
      }
    }
    getPlantilla();
  }, []);

  const enviarTerminos = () => {
    if (!telefono) {
      alert("⚠️ Este cliente no tiene un número de teléfono registrado.");
      return;
    }

    // Reemplazamos la variable mágica con el nombre real
    const mensajeTexto = plantilla.replace(/{{nombre}}/g, clienteNombre || "Cliente");

    // Limpiamos el número y le ponemos el 51 de Perú
    let numLimpio = telefono.replace(/\D/g, '');
    if (numLimpio.length === 9) numLimpio = '51' + numLimpio; 

    const url = `https://wa.me/${numLimpio}?text=${encodeURIComponent(mensajeTexto)}`;
    window.open(url, '_blank');
  };

  return (
    <button 
      onClick={enviarTerminos}
      title="Enviar Términos y Condiciones (PDF)"
      className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-blue-500/10 hover:text-blue-400 rounded-md transition-all flex-shrink-0"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    </button>
  );
}