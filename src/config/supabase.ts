import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validar variables de entorno requeridas
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('❌ SUPABASE_URL no está definida en las variables de entorno');
}

if (!supabaseAnonKey) {
  throw new Error('❌ SUPABASE_ANON_KEY no está definida en las variables de entorno');
}

if (!supabaseServiceKey) {
  throw new Error('❌ SUPABASE_SERVICE_KEY no está definida en las variables de entorno');
}

// Cliente público (para login, operaciones normales)
// Usa la anon key y respeta RLS (Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (para operaciones administrativas)
// Usa la service role key y bypass RLS
// ⚠️ SOLO usar para operaciones de admin como crear usuarios
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('✅ Supabase clients initialized');
