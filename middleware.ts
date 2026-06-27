import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Aquí le decimos al guardia qué rutas debe vigilar
export const config = {
  matcher: [
    /*
     * Vigila todas las rutas EXCEPTO:
     * - Archivos estáticos y de Next.js (_next/static, _next/image, favicon.ico)
     * - La ruta raíz (/) que ya tiene su propia redirección
     */
   // Reemplaza la línea del matcher por esta:
   '/((?!_next/static|_next/image|favicon.ico|cronograma|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}