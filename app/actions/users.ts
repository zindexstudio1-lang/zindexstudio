"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function createEmployee(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
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
    
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al crear el empleado.";
    return { error: errorMsg };
  }
}

export async function getTeamMembers(callerId: string, callerRole: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (callerRole === 'super_admin') {
    const { data } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    return data || [];
  } else {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .or(`id.eq.${callerId},admin_id.eq.${callerId}`)
      .order("created_at", { ascending: false });
    return data || [];
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { error } = await supabaseAdmin.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/usuarios");
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al actualizar.";
    return { error: errorMsg };
  }
}

export async function deleteEmployee(userId: string) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/usuarios");
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error al eliminar el empleado.";
    return { error: errorMsg };
  }
}

export async function getListaSocios() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: perfiles } = await supabaseAdmin.from("profiles").select("id, role");
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    
    if (!perfiles || !authData.users) return [];

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