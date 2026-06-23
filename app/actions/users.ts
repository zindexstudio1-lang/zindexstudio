"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// 1. CREAR EMPLEADO
export async function createEmployee(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  // Recibimos la identidad del que está creando la cuenta
  const adminId = formData.get("admin_id") as string;
  const creatorRole = formData.get("creator_role") as string;

  if (!email || !password || password.length < 6) {
    return { error: "El correo es inválido o la contraseña es muy corta." };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw new Error(authError.message);

    if (authData.user) {
      // Lógica de Negocio: 
      // Si el Z-Index (Super Admin) crea a alguien, nace como "admin".
      // Si un Admin (ej. Jeremías) crea a alguien, nace como "Operador" y se guarda el admin_id de Jeremías.
      const roleToAssign = creatorRole === 'super_admin' ? 'admin' : 'Operador';
      const finalAdminId = creatorRole === 'super_admin' ? null : adminId;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role: roleToAssign, admin_id: finalAdminId })
        .eq("id", authData.user.id);

      if (profileError) throw new Error(profileError.message);
    }

    revalidatePath("/dashboard/usuarios");
    return { success: true };
    
  } catch (error: any) {
    return { error: error.message || "Error al crear el empleado." };
  }
}

// 2. TRAER USUARIOS SEGÚN JERARQUÍA
export async function getTeamMembers(callerId: string, callerRole: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (callerRole === 'super_admin') {
    // Modo Dios: Trae a todos
    const { data } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    return data || [];
  } else {
    // Modo Inquilino: Trae al admin mismo y a sus operadores vinculados a su ID
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .or(`id.eq.${callerId},admin_id.eq.${callerId}`)
      .order("created_at", { ascending: false });
    return data || [];
  }
}

// 3. EDITAR ROL
export async function updateUserRole(userId: string, newRole: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { error } = await supabaseAdmin.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/usuarios");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al actualizar." };
  }
}

// 4. ELIMINAR EMPLEADO
export async function deleteEmployee(userId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    // 1. Borramos el perfil manualmente por precaución con la llave foránea
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    
    // 2. Lo aniquilamos del sistema de Autenticación
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/usuarios");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Error al eliminar el empleado." };
  }
}

// NUEVA FUNCIÓN: TRAER LISTA DE SOCIOS/USUARIOS PARA EL SELECTOR
export async function getListaSocios() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Traemos los perfiles con sus roles
    const { data: perfiles } = await supabaseAdmin.from("profiles").select("id, role");
    
    // 2. Traemos los correos del sistema de Auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!perfiles || !authData.users) return [];

    // 3. Fusionamos los datos
    const sociosReales = perfiles.map(perfil => {
      const authUser = authData.users.find(u => u.id === perfil.id);
      return {
        id: perfil.id,
        role: perfil.role,
        email: authUser?.email || 'Usuario sin correo'
      };
    });

    return sociosReales;
  } catch (error) {
    console.error("Error al traer socios:", error);
    return [];
  }
}