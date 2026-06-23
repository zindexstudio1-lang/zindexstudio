"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function iniciarSesion(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "El correo y la contraseña son obligatorios." };
  }

  // Importante: Tu función createClient del servidor es asíncrona por las cookies
  const supabase = await createClient();

  // 1. Validar en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: "Credenciales incorrectas o usuario no encontrado." };
  }

  // 2. Obtener el perfil del usuario para confirmar su rol en la empresa
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Error interno: El perfil de negocio no está configurado." };
  }

  // 3. Redirección al panel principal. El layout y los page.tsx se encargarán de filtrar las vistas
  redirect("/dashboard");
}