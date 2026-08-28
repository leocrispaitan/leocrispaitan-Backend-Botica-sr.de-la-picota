import { supabase } from '../src/config/supabase';

async function checkUsers() {
  console.log('🔍 Verificando usuarios en la base de datos...\n');

  // 1. Verificar usuarios en auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error al obtener usuarios de auth:', authError);
  } else {
    console.log(`✅ Usuarios en auth.users: ${authUsers.users.length}`);
    authUsers.users.forEach((user, index) => {
      console.log(`   ${index + 1}. Email: ${user.email}, ID: ${user.id}`);
    });
  }

  console.log('\n---\n');

  // 2. Verificar usuarios en la tabla usuario
  const { data: dbUsers, error: dbError } = await supabase
    .from('usuario')
    .select(`
      id_usuario,
      id_auth,
      email,
      nombre_usuario,
      nombre_completo,
      estado_logico,
      rol (
        id_rol,
        nombre_rol
      )
    `);

  if (dbError) {
    console.error('❌ Error al obtener usuarios de la tabla usuario:', dbError);
  } else {
    console.log(`✅ Usuarios en tabla usuario: ${dbUsers?.length || 0}`);
    dbUsers?.forEach((user, index) => {
      const rol = Array.isArray(user.rol) ? user.rol[0] : user.rol;
      console.log(`   ${index + 1}. ${user.nombre_completo} (${user.email})`);
      console.log(`      - Usuario: ${user.nombre_usuario}`);
      console.log(`      - ID Auth: ${user.id_auth}`);
      console.log(`      - Rol: ${rol?.nombre_rol || 'N/A'} (ID: ${rol?.id_rol || 'N/A'})`);
      console.log(`      - Estado: ${user.estado_logico ? '✅ Activo' : '❌ Inactivo'}`);
      console.log('');
    });
  }

  console.log('\n---\n');

  // 3. Verificar usuarios activos
  const { data: activeUsers, error: activeError } = await supabase
    .from('usuario')
    .select('*')
    .eq('estado_logico', true);

  if (activeError) {
    console.error('❌ Error al obtener usuarios activos:', activeError);
  } else {
    console.log(`✅ Usuarios activos: ${activeUsers?.length || 0}`);
  }

  console.log('\n---\n');

  // 4. Verificar si hay usuarios sin vincular
  if (authUsers && dbUsers) {
    const authIds = new Set(authUsers.users.map(u => u.id));
    const dbAuthIds = new Set(dbUsers.map(u => u.id_auth));

    const authOnly = authUsers.users.filter(u => !dbAuthIds.has(u.id));
    const dbOnly = dbUsers.filter(u => !authIds.has(u.id_auth));

    if (authOnly.length > 0) {
      console.log('⚠️  Usuarios en auth.users sin registro en tabla usuario:');
      authOnly.forEach(u => console.log(`   - ${u.email} (${u.id})`));
    } else {
      console.log('✅ Todos los usuarios de auth tienen registro en la tabla usuario');
    }

    console.log('');

    if (dbOnly.length > 0) {
      console.log('⚠️  Usuarios en tabla usuario sin registro en auth.users:');
      dbOnly.forEach(u => console.log(`   - ${u.email} (${u.id_auth})`));
    } else {
      console.log('✅ Todos los usuarios de la tabla tienen registro en auth');
    }
  }

  process.exit(0);
}

checkUsers().catch(console.error);
