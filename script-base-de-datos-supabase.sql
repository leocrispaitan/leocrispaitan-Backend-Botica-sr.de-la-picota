-- =====================================================================
--  botica control / farmacia picota — script para supabase

--  Backend: Node.js + Express + TypeScript
--  Frontend: React + TypeScript + Vite
--  Base de datos: supabase
--  despliegue:
-- frontend: Vercel
-- backend:  render
-- nube bd:  supabase
-- =====================================================================


-- =====================================================================
-- 1. tabla rol
-- =====================================================================
create table rol (
    id_rol serial primary key,
    nombre_rol varchar(50) not null unique,
    descripcion varchar(200),
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp
);

-- =====================================================================
-- 2. tabla usuario (personal: admin/vendedor/almacenero)
-- =====================================================================
-- CAMBIO IMPORTANTE: Integración con Supabase Auth
-- 
-- Esta tabla ya NO guarda contraseñas. La autenticación la maneja 100% Supabase Auth.
-- 
-- Campos clave:
--   - id_auth: UUID que enlaza con auth.users(id) de Supabase Auth
--   - email: Copiado de auth.users para consultas rápidas (sincronizado por trigger)
--   - dni: Documento de identidad del personal (obligatorio en Perú)
--   - nombre_usuario: Identificador interno/visualización (ya no se usa para login)
--   - foto_perfil_url: URL de avatar (Supabase Storage, UI Avatars, etc.)
--
-- Flujo de autenticación:
--   1. Usuario hace login con email/password → Supabase Auth valida
--   2. Supabase devuelve JWT con id_auth (UUID)
--   3. Backend busca en esta tabla por id_auth para obtener rol y permisos
--
create table usuario (
    id_usuario serial primary key,
    id_auth uuid unique not null,  -- ⭐ Enlace con auth.users(id)
    email varchar(100) not null unique,  -- Copiado de auth.users
    dni varchar(8) not null unique check (length(dni) = 8),  -- ⭐ DNI obligatorio (Perú)
    nombre_usuario varchar(50) not null unique,  -- Identificador interno
    nombre_completo varchar(150) not null,
    id_rol int not null,
    foto_perfil_url varchar(500),
    telefono varchar(20),
    ultimo_acceso timestamp,
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp,
    
    constraint fk_usuario_rol foreign key (id_rol)
        references rol(id_rol) on update cascade on delete restrict,
    constraint fk_usuario_auth foreign key (id_auth)
        references auth.users(id) on update cascade on delete cascade
);

-- =====================================================================
-- 2.1. trigger: crear perfil automático cuando se registra en auth
-- =====================================================================
-- Este trigger se ejecuta automáticamente cuando creas un usuario en Supabase Auth.
-- Lee los metadatos (raw_user_meta_data) y crea la fila correspondiente en la tabla usuario.
--
-- IMPORTANTE: Al crear el usuario en Auth, debes enviar estos campos en raw_user_meta_data:
-- {
--   "dni": "12345678",
--   "nombre_usuario": "admin.jperez",
--   "nombre_completo": "Juan Pérez Gómez",
--   "id_rol": 1,
--   "telefono": "987654321" (opcional)
-- }
--
create or replace function fn_crear_perfil_usuario()
returns trigger as $$
begin
    insert into public.usuario (
        id_auth,
        email,
        dni,
        nombre_usuario,
        nombre_completo,
        id_rol,
        telefono,
        foto_perfil_url
    ) values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'dni',
        new.raw_user_meta_data->>'nombre_usuario',
        new.raw_user_meta_data->>'nombre_completo',
        (new.raw_user_meta_data->>'id_rol')::int,
        new.raw_user_meta_data->>'telefono',
        -- Generar avatar automático con UI Avatars si no se proporciona
        coalesce(
            new.raw_user_meta_data->>'foto_perfil_url',
            'https://ui-avatars.com/api/?name=' || 
            replace(new.raw_user_meta_data->>'nombre_completo', ' ', '+') || 
            '&background=random&color=fff&size=200'
        )
    );
    return new;
end;
$$ language plpgsql security definer;

-- Crear el trigger en la tabla auth.users
create trigger trg_crear_perfil_usuario
after insert on auth.users
for each row execute function fn_crear_perfil_usuario();

-- =====================================================================
-- 2.2. función para actualizar ultimo_acceso
-- =====================================================================
-- Llama esta función desde tu backend cada vez que un usuario hace login exitoso
create or replace function fn_actualizar_ultimo_acceso(user_id uuid)
returns void as $$
begin
    update usuario
    set ultimo_acceso = current_timestamp
    where id_auth = user_id;
end;
$$ language plpgsql;

-- =====================================================================
-- 3. tabla cliente
-- =====================================================================
create table cliente (
    id_cliente serial primary key,
    tipo_documento varchar(10) not null
        check (tipo_documento in ('DNI','RUC','CE','PASAPORTE')),
    numero_documento varchar(15) not null unique,
    nombre_razon_social varchar(150) not null,
    telefono varchar(20),
    email varchar(100),
    direccion varchar(200),
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp
);

-- =====================================================================
-- 4. tabla categoria
-- =====================================================================
create table categoria (
    id_categoria serial primary key,
    nombre_categoria varchar(100) not null unique,
    descripcion text,
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp
);

-- =====================================================================
-- 5. tabla proveedor
-- =====================================================================
create table proveedor (
    id_proveedor serial primary key,
    nombre_proveedor varchar(100) not null,
    ruc varchar(15) not null unique,
    telefono varchar(20),
    email varchar(100),
    direccion varchar(200),
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp
);

-- =====================================================================
-- 6. tabla metodo_pago
-- =====================================================================
create table metodo_pago (
    id_metodo_pago serial primary key,
    nombre_metodo varchar(50) not null unique,
    descripcion varchar(200),
    estado_logico boolean not null default true
);

-- =====================================================================
-- 7. catálogos digemid
-- =====================================================================
create table forma_farmaceutica (
    id_forma_farmaceutica serial primary key,
    nombre varchar(60) not null unique,
    estado_logico boolean not null default true
);

create table via_administracion (
    id_via_administracion serial primary key,
    nombre varchar(60) not null unique,
    estado_logico boolean not null default true
);

create table condicion_venta (
    id_condicion_venta serial primary key,
    nombre varchar(100) not null unique,
    requiere_receta boolean not null default false,
    estado_logico boolean not null default true
);

create table clasificacion_atc (
    codigo_atc varchar(10) primary key,
    descripcion varchar(200) not null,
    estado_logico boolean not null default true
);

create table laboratorio (
    id_laboratorio serial primary key,
    nombre varchar(150) not null unique,
    pais varchar(80),
    tipo_entidad varchar(50),
    estado_logico boolean not null default true
);

-- =====================================================================
-- 8. tabla producto
-- =====================================================================
create table producto (
    id_producto serial primary key,
    nombre_comercial varchar(150) not null,
    nombre_generico varchar(150) not null,
    unidad_medida varchar(20) not null,
    composicion text,
    presentacion text,
    precio_venta decimal(10,2) not null check (precio_venta > 0),
    costo_referencial decimal(10,2) not null check (costo_referencial >= 0),
    stock_minimo_alerta int not null check (stock_minimo_alerta >= 0),
    imagen_url varchar(500),
    id_categoria int not null,
    id_proveedor int not null,
    id_forma_farmaceutica int,
    id_via_administracion int,
    id_condicion_venta int,
    codigo_atc varchar(10),
    id_laboratorio_titular int,
    id_fabricante int,
    estado_logico boolean not null default true,
    fecha_registro timestamp not null default current_timestamp,

    constraint fk_producto_categoria foreign key (id_categoria)
        references categoria(id_categoria) on update cascade on delete restrict,
    constraint fk_producto_proveedor foreign key (id_proveedor)
        references proveedor(id_proveedor) on update cascade on delete restrict,
    constraint fk_producto_forma foreign key (id_forma_farmaceutica)
        references forma_farmaceutica(id_forma_farmaceutica) on update cascade on delete set null,
    constraint fk_producto_via foreign key (id_via_administracion)
        references via_administracion(id_via_administracion) on update cascade on delete set null,
    constraint fk_producto_condicion foreign key (id_condicion_venta)
        references condicion_venta(id_condicion_venta) on update cascade on delete set null,
    constraint fk_producto_atc foreign key (codigo_atc)
        references clasificacion_atc(codigo_atc) on update cascade on delete set null,
    constraint fk_producto_titular foreign key (id_laboratorio_titular)
        references laboratorio(id_laboratorio) on update cascade on delete set null,
    constraint fk_producto_fabricante foreign key (id_fabricante)
        references laboratorio(id_laboratorio) on update cascade on delete set null
);

-- =====================================================================
-- 9. tabla registro_sanitario
-- =====================================================================
create table registro_sanitario (
    id_registro serial primary key,
    id_producto int not null,
    numero_rs varchar(50) not null,
    rs_anterior varchar(50),
    fecha_vencimiento date,
    estado_rs varchar(30) not null
        check (estado_rs in ('VIGENTE','VENCIDO','RENOVADO','SUSPENDIDO','CANCELADO')),
    fecha_consulta timestamp not null default current_timestamp,
    constraint fk_registro_producto foreign key (id_producto)
        references producto(id_producto) on update cascade on delete cascade
);

-- =====================================================================
-- 10. tabla inventario_lote
-- =====================================================================
create table inventario_lote (
    id_inventario serial primary key,
    id_producto int not null,
    numero_lote varchar(50) not null,
    fecha_vencimiento date,
    fecha_ingreso timestamp not null default current_timestamp,
    costo_unitario_compra decimal(10,2) not null check (costo_unitario_compra >= 0),
    stock_lote int not null check (stock_lote >= 0),
    ubicacion_estante varchar(50),
    constraint fk_lote_producto foreign key (id_producto)
        references producto(id_producto) on update cascade on delete restrict,
    constraint uq_producto_lote unique (id_producto, numero_lote)
);

-- =====================================================================
-- 11. tabla venta
-- =====================================================================
create table venta (
    id_venta serial primary key,
    fecha_venta timestamp not null default current_timestamp,
    id_cliente int,
    id_usuario int not null,
    id_metodo_pago int not null,
    tipo_comprobante varchar(20) not null
        check (tipo_comprobante in ('BOLETA','FACTURA','TICKET')),
    total_pagar decimal(10,2) not null check (total_pagar >= 0),
    monto_pagado decimal(10,2) not null check (monto_pagado >= 0),
    vuelto decimal(10,2) generated always as (monto_pagado - total_pagar) stored,
    estado_venta varchar(20) not null default 'PENDIENTE'
        check (estado_venta in ('PENDIENTE','PAGADA','ANULADA')),
    constraint fk_venta_cliente foreign key (id_cliente)
        references cliente(id_cliente) on update cascade on delete set null,
    constraint fk_venta_usuario foreign key (id_usuario)
        references usuario(id_usuario) on update cascade on delete restrict,
    constraint fk_venta_metodopago foreign key (id_metodo_pago)
        references metodo_pago(id_metodo_pago) on update cascade on delete restrict
);

-- =====================================================================
-- 12. tabla detalle_venta
-- =====================================================================
create table detalle_venta (
    id_detalle_venta serial primary key,
    id_venta int not null,
    id_producto int not null,
    cantidad int not null check (cantidad > 0),
    precio_unitario_venta decimal(10,2) not null check (precio_unitario_venta > 0),
    subtotal decimal(10,2) generated always as (cantidad * precio_unitario_venta) stored,
    constraint fk_detventa_venta foreign key (id_venta)
        references venta(id_venta) on update cascade on delete cascade,
    constraint fk_detventa_producto foreign key (id_producto)
        references producto(id_producto) on update cascade on delete restrict
);

-- =====================================================================
-- 13. tabla detalle_venta_lote
-- =====================================================================
create table detalle_venta_lote (
    id_detalle_venta_lote serial primary key,
    id_detalle_venta int not null,
    id_inventario int not null,
    cantidad int not null check (cantidad > 0),
    constraint fk_dvl_detalleventa foreign key (id_detalle_venta)
        references detalle_venta(id_detalle_venta) on update cascade on delete cascade,
    constraint fk_dvl_inventario foreign key (id_inventario)
        references inventario_lote(id_inventario) on update cascade on delete restrict
);

-- =====================================================================
-- 14. tabla movimiento
-- =====================================================================
create table movimiento (
    id_movimiento serial primary key,
    tipo_movimiento varchar(20) not null
        check (tipo_movimiento in ('COMPRA','VENTA','AJUSTE','DEVOLUCION','MERMA')),
    fecha_hora timestamp not null default current_timestamp,
    id_usuario int not null,
    motivo_ajuste text,
    constraint fk_movimiento_usuario foreign key (id_usuario)
        references usuario(id_usuario) on update cascade on delete restrict
);

-- =====================================================================
-- 15. tabla detalle_movimiento
-- =====================================================================
create table detalle_movimiento (
    id_detalle_mov serial primary key,
    id_movimiento int not null,
    id_producto int not null,
    id_inventario int,
    cantidad int not null check (cantidad > 0),
    costo_unitario decimal(10,2) not null check (costo_unitario >= 0),
    constraint fk_detmov_movimiento foreign key (id_movimiento)
        references movimiento(id_movimiento) on update cascade on delete cascade,
    constraint fk_detmov_producto foreign key (id_producto)
        references producto(id_producto) on update cascade on delete restrict,
    constraint fk_detmov_inventario foreign key (id_inventario)
        references inventario_lote(id_inventario) on update cascade on delete set null
);

-- =====================================================================
-- 16. trigger: factura exige cliente con ruc
-- =====================================================================
create or replace function fn_valida_venta_factura()
returns trigger as $$
begin
    if new.tipo_comprobante = 'FACTURA' then
        if new.id_cliente is null then
            raise exception 'Una FACTURA requiere un cliente registrado con RUC';
        end if;
        if not exists (
            select 1 from cliente
            where id_cliente = new.id_cliente and tipo_documento = 'RUC'
        ) then
            raise exception 'Para emitir FACTURA, el cliente debe tener Tipo_Documento = RUC';
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_valida_venta_factura
before insert or update on venta
for each row execute function fn_valida_venta_factura();

-- =====================================================================
-- índices
-- =====================================================================
create index idx_usuario_id_auth          on usuario(id_auth);
create index idx_usuario_email            on usuario(email);
create index idx_usuario_dni              on usuario(dni);
create index idx_usuario_rol              on usuario(id_rol);
create index idx_usuario_nombre           on usuario(nombre_usuario);
create index idx_producto_categoria       on producto(id_categoria);
create index idx_producto_proveedor       on producto(id_proveedor);
create index idx_producto_nombre_generico on producto(nombre_generico);
create index idx_producto_forma           on producto(id_forma_farmaceutica);
create index idx_producto_via             on producto(id_via_administracion);
create index idx_producto_condicion       on producto(id_condicion_venta);
create index idx_producto_atc             on producto(codigo_atc);
create index idx_producto_titular         on producto(id_laboratorio_titular);
create index idx_producto_fabricante      on producto(id_fabricante);
create index idx_laboratorio_nombre       on laboratorio(nombre);
create index idx_registro_producto        on registro_sanitario(id_producto);
create index idx_registro_numero          on registro_sanitario(numero_rs);
create index idx_lote_producto            on inventario_lote(id_producto);
create index idx_lote_vencimiento         on inventario_lote(fecha_vencimiento);
create index idx_venta_fecha              on venta(fecha_venta);
create index idx_venta_cliente            on venta(id_cliente);
create index idx_venta_usuario            on venta(id_usuario);
create index idx_detventa_venta           on detalle_venta(id_venta);
create index idx_detventa_producto        on detalle_venta(id_producto);
create index idx_dvl_inventario           on detalle_venta_lote(id_inventario);
create index idx_movimiento_usuario       on movimiento(id_usuario);
create index idx_detmov_producto          on detalle_movimiento(id_producto);
create index idx_detmov_inventario        on detalle_movimiento(id_inventario);
create index idx_cliente_documento        on cliente(numero_documento);

-- =====================================================================
-- vistas
-- =====================================================================
create view vista_stock_producto as
select
    p.id_producto,
    p.nombre_comercial,
    p.stock_minimo_alerta,
    coalesce(sum(il.stock_lote), 0) as stock_total_actual,
    case
        when coalesce(sum(il.stock_lote), 0) <= p.stock_minimo_alerta
        then true else false
    end as alerta_stock_bajo
from producto p
left join inventario_lote il on il.id_producto = p.id_producto
group by p.id_producto, p.nombre_comercial, p.stock_minimo_alerta;

create view vista_registro_sanitario_vigente as
select distinct on (rs.id_producto)
    rs.id_producto,
    rs.numero_rs,
    rs.rs_anterior,
    rs.fecha_vencimiento,
    rs.estado_rs,
    rs.fecha_consulta
from registro_sanitario rs
order by rs.id_producto, rs.fecha_consulta desc;

create view vista_producto_ficha_tecnica as
select
    p.id_producto,
    rs.numero_rs               as r_s,
    rs.rs_anterior              as r_s_anterior,
    rs.fecha_vencimiento        as fecha_venc,
    rs.estado_rs                as situacion,
    lt.nombre                   as titular,
    lt.tipo_entidad              as cat_titular,
    p.nombre_comercial          as producto,
    ff.nombre                   as forma_farmaceutica,
    lf.nombre                   as fabricante,
    lf.pais                     as procedencia,
    atc.codigo_atc || ' ' || atc.descripcion as clasificacion,
    cv.nombre                   as condicion_venta,
    cv.requiere_receta          as requiere_receta,
    p.composicion               as composicion,
    va.nombre                   as vias_administracion,
    p.presentacion               as presentacion
from producto p
left join vista_registro_sanitario_vigente rs on rs.id_producto = p.id_producto
left join laboratorio lt   on lt.id_laboratorio = p.id_laboratorio_titular
left join laboratorio lf   on lf.id_laboratorio = p.id_fabricante
left join forma_farmaceutica ff on ff.id_forma_farmaceutica = p.id_forma_farmaceutica
left join via_administracion va on va.id_via_administracion = p.id_via_administracion
left join condicion_venta cv    on cv.id_condicion_venta = p.id_condicion_venta
left join clasificacion_atc atc on atc.codigo_atc = p.codigo_atc;

-- =====================================================================
-- datos de ejemplo (seed) — ninguna tabla queda vacía
-- =====================================================================

-- 1. rol (los 3 pedidos)
insert into rol (nombre_rol, descripcion) values
    ('ADMINISTRATIVO', 'Acceso total: gestión de usuarios, reportes y configuración'),
    ('VENDEDOR', 'Atiende clientes y registra ventas en caja'),
    ('ALMACENERO', 'Gestiona inventario, lotes y movimientos de stock');

-- 2. usuario (uno por cada rol)
-- ⚠️ IMPORTANTE: Los usuarios YA NO se insertan directamente en esta tabla.
-- 
-- Ahora se crean a través de Supabase Auth y el trigger automáticamente
-- crea la fila en la tabla usuario.
--
-- Para crear usuarios, tienes 3 opciones:
--
-- OPCIÓN 1: Desde el Dashboard de Supabase (más fácil para testing)
--   1. Ir a Authentication → Users → Add User
--   2. Llenar email y password
--   3. En "User Metadata" agregar JSON:
--      {
--        "dni": "12345678",
--        "nombre_usuario": "admin.jperez",
--        "nombre_completo": "Juan Pérez Gómez",
--        "id_rol": 1,
--        "telefono": "987654321"
--      }
--   4. El trigger creará automáticamente la fila en la tabla usuario
--
-- OPCIÓN 2: Desde tu backend con Admin API (recomendado para producción)
--   Ver ejemplo en el archivo GUIA-SUPABASE-AUTH.md
--
-- OPCIÓN 3: Solo para desarrollo/testing - Insertar manualmente después de crear en Auth
--   (NO recomendado, mejor usar las opciones anteriores)
--
-- Para TESTING RÁPIDO, puedes ejecutar este script temporal:
-- (Copia y pega en el SQL Editor de Supabase DESPUÉS de ejecutar el script principal)

/*
-- ============ SCRIPT TEMPORAL PARA CREAR USUARIOS DE PRUEBA ============
-- Solo para desarrollo/testing. En producción usa la Admin API.

-- 1. Administrador
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@botica.com',
    crypt('admin123', gen_salt('bf')),  -- Password: admin123
    now(),
    jsonb_build_object(
        'dni', '12345678',
        'nombre_usuario', 'admin.jperez',
        'nombre_completo', 'Juan Pérez Gómez',
        'id_rol', 1,
        'telefono', '987654321'
    ),
    now(),
    now()
);

-- 2. Vendedor
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'vendedor@botica.com',
    crypt('vendedor123', gen_salt('bf')),  -- Password: vendedor123
    now(),
    jsonb_build_object(
        'dni', '87654321',
        'nombre_usuario', 'vend.mlopez',
        'nombre_completo', 'María López Ruiz',
        'id_rol', 2,
        'telefono', '976543210'
    ),
    now(),
    now()
);

-- 3. Almacenero
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'almacenero@botica.com',
    crypt('almacenero123', gen_salt('bf')),  -- Password: almacenero123
    now(),
    jsonb_build_object(
        'dni', '11223344',
        'nombre_usuario', 'alm.rsilva',
        'nombre_completo', 'Roberto Silva Vargas',
        'id_rol', 3,
        'telefono', '965432109'
    ),
    now(),
    now()
);

-- El trigger creará automáticamente las filas en la tabla usuario

-- ============ CREDENCIALES DE ACCESO ============
-- Email: admin@botica.com      | Password: admin123      | Rol: ADMINISTRATIVO
-- Email: vendedor@botica.com   | Password: vendedor123   | Rol: VENDEDOR
-- Email: almacenero@botica.com | Password: almacenero123 | Rol: ALMACENERO
*/

-- 3. cliente (uno con dni, uno con ruc para poder emitir factura)
insert into cliente (tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion) values
    ('DNI', '45678912', 'Carlos Ramírez Torres', '987654321', 'carlos.ramirez@example.com', 'Jr. Lima 123, Picota'),
    ('RUC', '20123456789', 'FARMACORP SAC', '976543210', 'contacto@farmacorp.com', 'Av. Industrial 456, Tarapoto');

-- 4. categoria
insert into categoria (nombre_categoria, descripcion) values
    ('ANALGESICOS', 'Medicamentos para el alivio del dolor y la fiebre'),
    ('ANTIBIOTICOS', 'Medicamentos para tratar infecciones bacterianas');

-- 5. proveedor
insert into proveedor (nombre_proveedor, ruc, telefono, email, direccion) values
    ('DROGUERIA DEL NORTE SAC', '20456789123', '042-522233', 'ventas@drogdelnorte.com', 'Jr. Comercio 200, Tarapoto'),
    ('QUIMICA SUIZA S.A.', '20567891234', '01-6143333', 'pedidos@quimicasuiza.com', 'Av. República de Panamá 3956, Lima');

-- 6. metodo_pago
insert into metodo_pago (nombre_metodo, descripcion) values
    ('EFECTIVO', 'Pago en efectivo'),
    ('TARJETA', 'Pago con tarjeta débito/crédito'),
    ('YAPE_PLIN', 'Pago por billetera digital'),
    ('TRANSFERENCIA', 'Transferencia bancaria');

-- 7. catálogos digemid
insert into condicion_venta (nombre, requiere_receta) values
    ('Venta Libre', false),
    ('Venta Bajo Receta Médica', true),
    ('Venta Bajo Receta Médica Retenida', true),
    ('Venta Bajo Receta Médica Especial', true);

insert into forma_farmaceutica (nombre) values
    ('JARABE'), ('TABLETA'), ('CAPSULA'), ('SUSPENSION'),
    ('CREMA'), ('POMADA'), ('GOTAS'), ('INYECTABLE'), ('OVULO');

insert into via_administracion (nombre) values
    ('ORAL'), ('TOPICA'), ('OFTALMICA'), ('NASAL'),
    ('RECTAL'), ('INYECTABLE'), ('OTICA');

insert into laboratorio (nombre, pais, tipo_entidad) values
    ('GLAXOSMITHKLINE PERU S.A.', 'PERU', 'DROGUERÍA'),
    ('GLAXOSMITHKLINE COSTA RICA S.A.', 'COSTA RICA', 'FABRICANTE');

insert into clasificacion_atc (codigo_atc, descripcion) values
    ('N02BE01', 'PARACETAMOL'),
    ('J01CA04', 'AMOXICILINA');

-- 8. producto
insert into producto (
    nombre_comercial, nombre_generico, unidad_medida, composicion, presentacion,
    precio_venta, costo_referencial, stock_minimo_alerta, id_categoria, id_proveedor,
    id_forma_farmaceutica, id_via_administracion, id_condicion_venta, codigo_atc,
    id_laboratorio_titular, id_fabricante
) values
    ('Panadol Jarabe', 'Paracetamol', 'Frasco',
     'POR DOSIS 5.00 mL - PARACETAMOL 160.000000 mg', 'Caja de cartón con frasco x 60 mL',
     12.50, 7.00, 10, 1, 1, 1, 1, 1, 'N02BE01', 1, 2),
    ('Amoxil 500', 'Amoxicilina', 'Caja',
     'CADA CAPSULA CONTIENE - AMOXICILINA 500 mg', 'Caja con 12 cápsulas',
     18.00, 11.00, 15, 2, 2, 3, 1, 2, 'J01CA04', 2, 1);

-- 9. registro_sanitario
insert into registro_sanitario (id_producto, numero_rs, rs_anterior, fecha_vencimiento, estado_rs) values
    (1, 'EE-12345', null, '2027-12-31', 'VIGENTE'),
    (2, 'EE-67890', null, '2027-06-30', 'VIGENTE');

-- 10. inventario_lote
insert into inventario_lote (id_producto, numero_lote, fecha_vencimiento, costo_unitario_compra, stock_lote, ubicacion_estante) values
    (1, 'LOTE-A001', '2027-01-15', 7.00, 50, 'Estante A1'),
    (2, 'LOTE-B002', '2026-11-20', 11.00, 30, 'Estante B2');

-- 11. venta (una boleta sin cliente, una factura con cliente ruc)
-- ⚠️ NOTA: Para insertar ventas de ejemplo, primero debes crear los usuarios en Supabase Auth
-- Luego obtén el id_usuario correcto de la tabla usuario y reemplaza los valores aquí
-- Por ahora, estos INSERT están comentados hasta que crees los usuarios

-- Ejemplo de cómo obtener los id_usuario después de crear usuarios en Auth:
-- SELECT id_usuario, nombre_usuario, email FROM usuario;

/*
insert into venta (id_cliente, id_usuario, id_metodo_pago, tipo_comprobante, total_pagar, monto_pagado, estado_venta) values
    (null, [ID_USUARIO_VENDEDOR], 1, 'BOLETA', 25.00, 30.00, 'PAGADA'),
    (2, [ID_USUARIO_VENDEDOR], 4, 'FACTURA', 54.00, 54.00, 'PAGADA');
*/

-- 12. detalle_venta
-- ⚠️ NOTA: Comentado hasta que crees las ventas con id_usuario válidos

/*
insert into detalle_venta (id_venta, id_producto, cantidad, precio_unitario_venta) values
    (1, 1, 2, 12.50),
    (2, 2, 3, 18.00);
*/

-- 13. detalle_venta_lote
-- ⚠️ NOTA: Comentado hasta que crees las ventas con id_usuario válidos

/*
insert into detalle_venta_lote (id_detalle_venta, id_inventario, cantidad) values
    (1, 1, 2),
    (2, 2, 3);
*/

-- 14. movimiento
-- ⚠️ NOTA: Comentado hasta que crees los usuarios con id_usuario válidos

/*
-- compra registrada por el almacenero, venta por el vendedor
insert into movimiento (tipo_movimiento, id_usuario, motivo_ajuste) values
    ('COMPRA', [ID_USUARIO_ALMACENERO], 'Ingreso inicial de mercadería'),
    ('VENTA', [ID_USUARIO_VENDEDOR], null);
*/

-- 15. detalle_movimiento
-- ⚠️ NOTA: Comentado hasta que crees los movimientos con id_usuario válidos

/*
insert into detalle_movimiento (id_movimiento, id_producto, id_inventario, cantidad, costo_unitario) values
    (1, 1, 1, 50, 7.00),
    (2, 2, 2, 3, 11.00);
*/
