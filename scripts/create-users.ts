/**
 * Script para crear los 3 usuarios iniciales en Supabase Auth
 * 
 * Usuarios a crear:
 * 1. Administrador
 * 2. Vendedor
 * 3. Almacenero
 * 
 * Ejecutar con: npm run create-users
 */

import { supabaseAdmin } from '../src/config/supabase';
import dotenv from 'dotenv';

dotenv.config();

interface UserData {
  email: string;
  password: string;
  dni: string;
  nombre_usuario: string;
  nombre_completo: string;
  id_rol: number;
  telefono: string;
  rol_nombre: string;
}

// Datos de los 3 usuarios iniciales
const usuarios: UserData[] = [
  {
    email: 'admin@botica.com',
    password: 'admin123',
    dni: '12345678',
    nombre_usuario: 'admin.jperez',
    nombre_completo: 'Juan Pérez Gómez',
    id_rol: 1,
    telefono: '987654321',
    rol_nombre: 'ADMINISTRATIVO',
  },
  {
    email: 'vendedor@botica.com',
    password: 'vendedor123',
    dni: '87654321',
    nombre_usuario: 'vend.mlopez',
    nombre_completo: 'María López Ruiz',
    id_rol: 2,
    telefono: '976543210',
    rol_nombre: 'VENDEDOR',
  },
  {
    email: 'almacenero@botica.com',
    password: 'almacenero123',
    dni: '11223344',
    nombre_usuario: 'alm.rsilva',
    nombre_completo: 'Roberto Silva Vargas',
    id_rol: 3,
    telefono: '965432109',
    rol_nombre: 'ALMACENERO',
  },
];

/**
 * Crear un usuario en Supabase Auth
 */
async function createUser(userData: UserData) {
  try {
    console.log(`\n📝 Creando usuario: ${userData.email}`);
    console.log(`   Rol: ${userData.rol_nombre}`);
    console.log(`   DNI: ${userData.dni}`);

    // Verificar si el usuario ya existe por email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(
      (user) => user.email === userData.email
    );

    if (userExists) {
      console.log(`   ⚠️  Usuario ya existe, saltando...`);
      return;
    }

    // Crear usuario en Supabase Auth con metadatos
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        dni: userData.dni,
        nombre_usuario: userData.nombre_usuario,
        nombre_completo: userData.nombre_completo,
        id_rol: userData.id_rol,
        telefono: userData.telefono,
      },
    });

    if (error) {
      console.error(`   ❌ Error al crear usuario: ${error.message}`);
      return;
    }

    console.log(`   ✅ Usuario creado exitosamente`);
    console.log(`   🆔 ID Auth: ${data.user.id}`);

    // Esperar un momento para que el trigger cree el registro en la tabla usuario
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar que el usuario se creó en la tabla usuario
    const { data: usuarioData, error: dbError } = await supabaseAdmin
      .from('usuario')
      .select('*')
      .eq('id_auth', data.user.id)
      .single();

    if (dbError || !usuarioData) {
      console.error(`   ⚠️  Advertencia: No se encontró el usuario en la tabla usuario`);
      console.error(`   Esto puede significar que el trigger no se ejecutó correctamente`);
    } else {
      console.log(`   ✅ Registro creado en tabla usuario (ID: ${usuarioData.id_usuario})`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error inesperado: ${error.message}`);
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 SCRIPT DE CREACIÓN DE USUARIOS INICIALES');
  console.log('═══════════════════════════════════════════════════════');

  // Validar configuración
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.error('   Por favor configura SUPABASE_URL y SUPABASE_SERVICE_KEY en el archivo .env');
    process.exit(1);
  }

  console.log('📋 Se crearán 3 usuarios:');
  console.log('   1. Administrador (admin@botica.com)');
  console.log('   2. Vendedor (vendedor@botica.com)');
  console.log('   3. Almacenero (almacenero@botica.com)');

  // Crear cada usuario
  for (const usuario of usuarios) {
    await createUser(usuario);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ PROCESO COMPLETADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 CREDENCIALES DE ACCESO:');
  console.log('\n1. ADMINISTRADOR:');
  console.log('   Email:    admin@botica.com');
  console.log('   Password: admin123');
  console.log('\n2. VENDEDOR:');
  console.log('   Email:    vendedor@botica.com');
  console.log('   Password: vendedor123');
  console.log('\n3. ALMACENERO:');
  console.log('   Email:    almacenero@botica.com');
  console.log('   Password: almacenero123');
  console.log('\n⚠️  IMPORTANTE: Cambia estas contraseñas en producción');
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(0);
}

// Ejecutar script
main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
