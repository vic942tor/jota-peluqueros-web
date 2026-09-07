// Claves públicas (seguras de exponer en el navegador) — la seguridad real
// vive en las reglas RLS de la base de datos, no en ocultar esta clave.
const SUPABASE_URL = 'https://skvukvwvuiamwkppnybw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrdnVrdnd2dWlhbXdrcHBueWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODQyODksImV4cCI6MjEwNDM2MDI4OX0.69PyvQ5ahT_VdBGdzZeFZ5qtqBnsY-5Z0XVH8-lCvA8';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
