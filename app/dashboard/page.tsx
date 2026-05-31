export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto mt-10">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Panel de Control</h1>
          <p className="text-zinc-400 mb-8">
            Bienvenido al sistema de administración SaaS de Z-Index Studio.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarjetas de estadísticas de prueba */}
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
              <h3 className="text-zinc-400 text-sm font-medium">Usuarios Activos</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">1</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
              <h3 className="text-zinc-400 text-sm font-medium">Ingresos Mes</h3>
              <p className="text-3xl font-bold text-emerald-400 mt-2">$0.00</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
              <h3 className="text-zinc-400 text-sm font-medium">Estado del Sistema</h3>
              <p className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                En línea
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}