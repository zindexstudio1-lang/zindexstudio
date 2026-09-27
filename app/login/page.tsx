"use client";

import { useState } from "react";
import Image from "next/image";
import { iniciarSesion } from "@/app/actions/auth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await iniciarSesion(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  };

  return (
    // Fondo principal: Azul marino corporativo con un sutil degradado
    <div className="min-h-screen bg-gradient-to-br from-[#0d1b32] via-[#0a1526] to-[#12223d] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Resplandor de fondo: Dorado corporativo amplio */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c39c4a]/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Tarjeta de Login: Blanca pura para que el logo se fusione de manera impecable */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Branding con el Logo */}
        <div className="text-center flex flex-col items-center">
          <Image 
            src="/LOGOLABORIANO.png" 
            alt="Logo Laboriano Capital" 
            width={140} 
            height={140} 
            priority
            className="object-contain mb-1"
          />
          <p className="text-xs text-[#c39c4a] mt-2 font-bold uppercase tracking-widest">
            Gestión Financiera
          </p>
        </div>

        {/* Modal de Error de Credenciales */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 font-medium">
            <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#0d1b32] mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="acceso@laborianocapital.com" 
              // Inputs con fondo gris muy claro para contrastar con la tarjeta blanca
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#0d1b32] outline-none focus:ring-2 focus:ring-[#c39c4a]/50 focus:border-[#c39c4a] transition-all placeholder:text-gray-400" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0d1b32] mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="••••••••" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#0d1b32] outline-none focus:ring-2 focus:ring-[#c39c4a]/50 focus:border-[#c39c4a] transition-all placeholder:text-gray-400" 
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            // Botón azul marino con texto blanco y reborde dorado al interactuar
            className="w-full py-3 bg-[#0d1b32] hover:bg-[#152a4d] text-white font-semibold rounded-lg text-sm transition-all shadow-md shadow-[#0d1b32]/20 active:scale-[0.98] disabled:opacity-50 mt-4 border border-transparent hover:border-[#c39c4a]/70"
          >
            {isLoading ? "Verificando identidad..." : "Ingresar al Sistema"}
          </button>
        </form>

      </div>
    </div>
  );
}