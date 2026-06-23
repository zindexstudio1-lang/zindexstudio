"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { createEmployee, getTeamMembers, updateUserRole, deleteEmployee } from "@/app/actions/users"; 

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function loadInitialData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setCurrentUser(profile);
        
        const data = await getTeamMembers(profile.id, profile.role);
        setRealUsers(data);
        setIsLoadingTable(false);
      }
    }
    loadInitialData();
  }, []);

  const refreshTable = async () => {
    if (currentUser) {
      const data = await getTeamMembers(currentUser.id, currentUser.role);
      setRealUsers(data);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setServerMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createEmployee(null, formData);

    if (result.error) {
      setServerMessage({ type: 'error', text: result.error });
      setIsLoading(false);
    } else if (result.success) {
      setServerMessage({ type: 'success', text: '¡Empleado creado con éxito!' });
      createFormRef.current?.reset();
      await refreshTable(); 
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setServerMessage(null);
        setIsLoading(false);
      }, 1500);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setServerMessage(null);

    const formData = new FormData(e.currentTarget);
    const newRole = formData.get("role") as string;
    
    const result = await updateUserRole(selectedUser.id, newRole);

    if (result.error) {
      setServerMessage({ type: 'error', text: result.error });
      setIsLoading(false);
    } else if (result.success) {
      setServerMessage({ type: 'success', text: '¡Rol actualizado con éxito!' });
      await refreshTable(); 
      setTimeout(() => {
        setIsEditModalOpen(false);
        setServerMessage(null);
        setIsLoading(false);
      }, 1500);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    setServerMessage(null);
    
    const result = await deleteEmployee(selectedUser.id);
    
    if (result.error) {
      setServerMessage({ type: 'error', text: result.error });
      setIsLoading(false);
    } else if (result.success) {
      setServerMessage({ type: 'success', text: '¡Usuario eliminado permanentemente!' });
      await refreshTable();
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setServerMessage(null);
        setIsLoading(false);
      }, 1500);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Desconocida";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getAdminEmail = (adminId: string) => {
    const admin = realUsers.find(u => u.id === adminId);
    return admin ? admin.email : "Desconocido";
  };

  const filteredUsers = realUsers.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Mi Equipo</h1>
          <p className="text-sm text-zinc-400">Gestiona los accesos y roles de tu personal.</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span>Añadir empleado</span>
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80">
          <div style={{ position: 'relative', width: '100%', maxWidth: '28rem' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#71717a' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <input type="text" placeholder="Buscar por correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', paddingLeft: '44px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '0.5rem', outline: 'none', color: 'white', fontSize: '0.875rem' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-zinc-950/50 text-zinc-500 border-b border-zinc-800/80">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold text-left">Usuario / Correo</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Rol</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Estado</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Fecha de registro</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              
              {isLoadingTable && <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Cargando usuarios...</td></tr>}

              {!isLoadingTable && filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 uppercase">
                        {user.email ? user.email.charAt(0) : "?"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{user.email}</span>
                        {currentUser?.role === 'super_admin' && user.admin_id && (
                          <span className="text-xs text-zinc-500 mt-0.5">De: {getAdminEmail(user.admin_id)}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                      user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                      'bg-zinc-800/50 text-zinc-300 border-zinc-700/50'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : user.role === 'super_admin' ? 'Super Admin' : 'Operador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Activo</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center capitalize">
                    {formatDate(user.created_at)}
                  </td>
                  
                  {/* AQUÍ ESTÁN LOS ICONOS SOLUCIONADOS */}
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                    <div className="flex items-center justify-center gap-3">
                      
                      <button 
                        onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                        title="Editar rol"
                        className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-md transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      
                      {user.id !== currentUser?.id && (
                        <button 
                          onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }}
                          title="Eliminar usuario"
                          className="p-1.5 text-zinc-400 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))}
              
              {!isLoadingTable && filteredUsers.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No se encontraron usuarios.</td></tr>}

            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREAR EMPLEADO */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)' }} onClick={() => !isLoading && setIsCreateModalOpen(false)}></div>
          
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #3f3f46' }}>
              <h2 className="text-xl font-bold text-white">Nuevo empleado</h2>
              <p className="text-sm text-zinc-400 mt-1">Crea una cuenta para tu equipo.</p>
            </div>
            
            <form ref={createFormRef} onSubmit={handleCreateSubmit}>
              <input type="hidden" name="admin_id" value={currentUser?.id || ''} />
              <input type="hidden" name="creator_role" value={currentUser?.role || ''} />
              
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {serverMessage && (
                  <div className={`p-3 rounded-lg text-sm border ${serverMessage.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
                    {serverMessage.text}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Correo del empleado</label>
                  <input type="email" name="email" required placeholder="ejemplo@empresa.com" style={{ width: '100%', padding: '0.5rem 1rem', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '0.5rem', color: 'white', outline: 'none' }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Contraseña temporal</label>
                  <input type="password" name="password" required minLength={6} placeholder="Mínimo 6 caracteres" style={{ width: '100%', padding: '0.5rem 1rem', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '0.5rem', color: 'white', outline: 'none' }} />
                </div>
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid #3f3f46', backgroundColor: '#09090b', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" disabled={isLoading} onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50">
                  {isLoading ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ROL */}
      {isEditModalOpen && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)' }} onClick={() => !isLoading && setIsEditModalOpen(false)}></div>
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #3f3f46' }}>
              <h2 className="text-xl font-bold text-white">Editar Usuario</h2>
              <p className="text-sm text-zinc-400 mt-1">Modificando a: <span className="text-indigo-400 font-medium">{selectedUser.email}</span></p>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {serverMessage && (
                  <div className={`p-3 rounded-lg text-sm border ${serverMessage.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
                    {serverMessage.text}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Asignar nuevo rol</label>
                  <select name="role" defaultValue={selectedUser.role} style={{ width: '100%', padding: '0.75rem 1rem', backgroundColor: '#09090b', border: '1px solid #3f3f46', borderRadius: '0.5rem', color: 'white', outline: 'none' }}>
                    <option value="Operador">Operador (Acceso limitado)</option>
                    <option value="admin">Administrador (Acceso al negocio)</option>
                    <option value="super_admin">Super Admin (Acceso total)</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid #3f3f46', backgroundColor: '#09090b', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" disabled={isLoading} onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50">
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ELIMINAR USUARIO */}
      {isDeleteModalOpen && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.9)' }} onClick={() => !isLoading && setIsDeleteModalOpen(false)}></div>
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem', backgroundColor: '#18181b', border: '1px solid #7f1d1d', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #3f3f46' }}>
              <div className="flex items-center gap-3 text-red-500 mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h2 className="text-xl font-bold">Zona de Peligro</h2>
              </div>
              <p className="text-sm text-zinc-400">¿Estás seguro que deseas eliminar permanentemente la cuenta de <span className="text-white font-medium">{selectedUser.email}</span>?</p>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {serverMessage && (
                <div className={`p-3 rounded-lg text-sm border ${serverMessage.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
                  {serverMessage.text}
                </div>
              )}
              <p className="text-sm text-red-400/80 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                Esta acción borrará sus accesos de inmediato y no se puede deshacer.
              </p>
            </div>
            
            <div style={{ padding: '1rem', borderTop: '1px solid #3f3f46', backgroundColor: '#09090b', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" disabled={isLoading} onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={handleDeleteConfirm} disabled={isLoading} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50">
                {isLoading ? 'Eliminando...' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}