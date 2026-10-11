"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { createEmployee, getTeamMembers, updateUserRole, deleteEmployee } from "@/app/actions/users"; 

// 1. DEFINIMOS LOS MOLDES (INTERFACES)
interface ICurrentUser {
  id: string;
  role?: string;
  [key: string]: unknown;
}

interface IRealUser {
  id: string;
  email?: string;
  role: string;
  created_at: string;
  admin_id?: string | null;
}

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // 2. REEMPLAZAMOS LOS "any" POR NUESTROS MOLDES
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<IRealUser | null>(null);
  
  const [realUsers, setRealUsers] = useState<IRealUser[]>([]);
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
        setCurrentUser(profile as ICurrentUser);
        
        const data = await getTeamMembers(profile.id, profile.role);
        setRealUsers(data as IRealUser[]);
        setIsLoadingTable(false);
      }
    }
    loadInitialData();
  }, []);

  const refreshTable = async () => {
    if (currentUser) {
      const data = await getTeamMembers(currentUser.id, currentUser.role || "");
      setRealUsers(data as IRealUser[]);
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
    if (!selectedUser) return; 

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
    if (!selectedUser) return; 
    
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
    return admin?.email || "Desconocido";
  };

  const filteredUsers = realUsers.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 relative bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0B172A] mb-1">Mi Equipo</h1>
          <p className="text-sm text-slate-500">Gestiona los accesos y roles de tu personal.</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start sm:self-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B172A] hover:bg-[#1a2c4c] text-[#C5A059] text-sm font-medium rounded-lg transition-all shadow-md active:scale-[0.98]"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span>Añadir empleado</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-full max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por correo..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg outline-none text-[#0B172A] text-sm focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold text-left">Usuario / Correo</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Rol</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Estado</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Fecha de registro</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {isLoadingTable && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando usuarios...</td></tr>}

              {!isLoadingTable && filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#0B172A]/10 flex items-center justify-center text-xs font-bold text-[#0B172A] uppercase border border-[#0B172A]/20">
                        {user.email ? user.email.charAt(0) : "?"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0B172A]">{user.email}</span>
                        {currentUser?.role === 'super_admin' && user.admin_id && (
                          <span className="text-xs text-slate-400 mt-0.5 font-medium">De: {getAdminEmail(user.admin_id)}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                      user.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      user.role === 'admin' ? 'bg-[#0B172A]/5 text-[#0B172A] border-[#0B172A]/20' : 
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : user.role === 'super_admin' ? 'Super Admin' : 'Operador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-slate-600 font-medium">Activo</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center text-slate-500 capitalize font-medium">
                    {formatDate(user.created_at)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap align-middle text-center">
                    <div className="flex items-center justify-center gap-3">
                      
                      <button 
                        onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                        title="Editar rol"
                        className="p-1.5 text-slate-400 bg-slate-100 hover:bg-[#0B172A]/10 hover:text-[#0B172A] border border-transparent hover:border-[#0B172A]/20 rounded-md transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      
                      {user.id !== currentUser?.id && (
                        <button 
                          onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }}
                          title="Eliminar usuario"
                          className="p-1.5 text-slate-400 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 rounded-md transition-all duration-200"
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
              
              {!isLoadingTable && filteredUsers.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">No se encontraron usuarios.</td></tr>}

            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREAR EMPLEADO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && setIsCreateModalOpen(false)}></button>
          
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0B172A]">Nuevo empleado</h2>
              <p className="text-sm text-slate-500 mt-1">Crea una cuenta para tu equipo.</p>
            </div>
            
            <form ref={createFormRef} onSubmit={handleCreateSubmit}>
              <input type="hidden" name="admin_id" value={currentUser?.id || ''} />
              <input type="hidden" name="creator_role" value={currentUser?.role || ''} />
              
              <div className="p-6 flex flex-col gap-4">
                {serverMessage && (
                  <div className={`p-3 rounded-lg text-sm border font-medium ${serverMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                    {serverMessage.text}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo del empleado
                  <input type="email" name="email" required placeholder="ejemplo@empresa.com" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-[#0B172A] outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] shadow-inner transition-all" /></label>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Contraseña temporal
                  <input type="password" name="password" required minLength={6} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-[#0B172A] outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] shadow-inner transition-all" /></label>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" disabled={isLoading} onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-bold bg-[#0B172A] hover:bg-[#152A4A] text-[#C5A059] rounded-lg shadow-md transition-colors disabled:opacity-50">
                  {isLoading ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR ROL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && setIsEditModalOpen(false)}></button>
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-[#0B172A]">Editar Usuario</h2>
              <p className="text-sm text-slate-500 mt-1">Modificando a: <span className="text-[#C5A059] font-bold">{selectedUser.email}</span></p>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 flex flex-col gap-4">
                {serverMessage && (
                  <div className={`p-3 rounded-lg text-sm border font-medium ${serverMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                    {serverMessage.text}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Asignar nuevo rol</label>
                  <select name="role" defaultValue={selectedUser.role} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-[#0B172A] outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] shadow-inner transition-all">
                    <option value="Operador">Operador (Acceso limitado)</option>
                    <option value="admin">Administrador (Acceso al negocio)</option>
                    <option value="super_admin">Super Admin (Acceso total)</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button type="button" disabled={isLoading} onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-bold bg-[#0B172A] hover:bg-[#152A4A] text-[#C5A059] shadow-md rounded-lg transition-colors disabled:opacity-50">
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ELIMINAR USUARIO */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && setIsDeleteModalOpen(false)}></button>
          <div className="relative z-10 w-full max-w-md bg-white border border-red-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h2 className="text-xl font-bold">Zona de Peligro</h2>
              </div>
              <p className="text-sm text-slate-600">¿Estás seguro que deseas eliminar permanentemente la cuenta de <span className="text-[#0B172A] font-bold">{selectedUser.email}</span>?</p>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              {serverMessage && (
                <div className={`p-3 rounded-lg text-sm border font-medium ${serverMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                  {serverMessage.text}
                </div>
              )}
              <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
                Esta acción borrará sus accesos de inmediato y no se puede deshacer.
              </p>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" disabled={isLoading} onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 shadow-sm">Cancelar</button>
              <button type="button" onClick={handleDeleteConfirm} disabled={isLoading} className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 shadow-md">
                {isLoading ? 'Eliminando...' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}