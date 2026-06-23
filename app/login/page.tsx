"use client";

import { useState } from "react";
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

    // Si hay error en las credenciales, atrapamos el mensaje del servidor
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Resplandor de fondo Z-Index Studio */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Branding */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Z-Index <span className="text-indigo-400">Studio</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Panel Administrativo y Automatización SaaS
          </p>
        </div>

        {/* Modal de Error de Credenciales */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2 font-medium">
            <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="acceso@zindexstudio.com" 
              className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="••••••••" 
              className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600" 
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? "Verificando identidad..." : "Ingresar al Sistema"}
          </button>
        </form>

      </div>
    </div>
  );
}