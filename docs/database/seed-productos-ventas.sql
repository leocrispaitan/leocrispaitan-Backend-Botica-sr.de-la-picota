-- =====================================================================
--  Seed: 55+ productos, categorías, lotes con vencimiento, registro
--  sanitario y VENTAS realizadas por el vendedor (vendedor@botica.com)
--
--  Botica Control / Farmacia Picota — Supabase SQL Editor
-- =====================================================================
-- ⚠️ CÓMO USAR:
--   1. Abre Supabase → SQL Editor → New query.
--   2. Pega TODO este archivo y ejecuta.
--   3. Es IDEMPOTENTE: si lo ejecutas de nuevo NO duplica nada
--      (usa ON CONFLICT y WHERE NOT EXISTS en los catálogos).
--
-- Qué registra este script:
--   • Categorías nuevas (GASTROINTESTINALES, RESPIRATORIOS, ...)
--   • Proveedores, laboratorios y clasificaciones ATC nuevos
--   • Clientes adicionales (DNI y RUC para poder emitir FACTURA)
--   • 55 productos reales con: genérico, unidad, composición,
--     presentación, precio, costo, stock mínimo, categoría, proveedor,
--     forma farmacéutica, vía de administración, condición de venta,
--     código ATC, laboratorio titular y fabricante.
--   • registro_sanitario (número RS + fecha de vencimiento del RS)
--   • inventario_lote con FECHA DE VENCIMIENTO de cada lote y stock
--   • 13 ventas (BOLETA / TICKET / FACTURA) realizadas por
--     vendedor@botica.com, con su detalle y salida de lote
--   • Movimientos de inventario (1 COMPRA + 13 VENTA) y sus detalles
--
-- Los id_usuario se resuelven por EMAIL, así que funciona aunque el
-- serial de tu base sea distinto.
-- =====================================================================

begin;

-- =====================================================================
-- 1. CATÁLOGOS NUEVOS (sin duplicar los ya existentes)
-- =====================================================================

-- ── Categorías ──
insert into categoria (nombre_categoria, descripcion) values
    ('GASTROINTESTINALES', 'Digestivo, acidez, antieméticos y antidiarreicos'),
    ('RESPIRATORIOS', 'Antitusivos, mucolíticos y broncodilatadores'),
    ('DERMATOLOGICOS', 'Antimicóticos, antibióticos y corticoides tópicos'),
    ('ANTIALERGICOS', 'Antihistamínicos para alergias'),
    ('CARDIOVASCULARES', 'Hipertensión, antiagregantes y cardiología'),
    ('VITAMINAS Y SUPLEMENTOS', 'Vitaminas, minerales y suplementos'),
    ('OFTALMICOS', 'Gotas y preparados oftálmicos'),
    ('NEUROLOGICOS', 'Psiquiátricos y neurológicos')
on conflict (nombre_categoria) do nothing;

-- ── Proveedores ──
insert into proveedor (nombre_proveedor, ruc, telefono, email, direccion) values
    ('FARMADROGAS SAC', '20456123789', '01-4401123', 'compras@farmadrogas.com', 'Av. Aviación 2500, Lima'),
    ('DROGUERIA PERUANA S.A.C.', '20512345671', '01-6209900', 'ventas@drogueriaperuana.com', 'Jr. Paruro 300, Lima'),
    ('A-C FARMA S.A.C.', '20508765432', '01-2258877', 'pedidos@acfarma.com', 'Av. Universitaria 1800, Lima'),
    ('FARMA ANDINA E.I.R.L.', '20604527123', '042-501200', 'contacto@farmaandina.com', 'Jr. Progreso 450, Tarapoto'),
    ('GLAXOSMITHKLINE PERU S.A.', '20166882912', '01-6159000', 'ventasperu@gsk.com', 'Av. República de Panamá 3050, Lima'),
    ('SANOFI AVENTIS DEL PERU S.A.', '20100131020', '01-6401234', 'comercial@sanofi.com', 'Av. Canaval y Moreyra 380, Lima'),
    ('MERCK PERUANA S.A.', '20336622157', '01-6188600', 'peru@merckgroup.com', 'Jr. Las Begonias 441, Lima'),
    ('BAYER S.A.', '20100045241', '01-6123000', 'contacto@bayer.com', 'Av. Guardia Civil 280, Lima'),
    ('GENFAR S.A.', '20100412345', '01-6264000', 'pedidos@genfar.com', 'Av. Tomas Marsano 2600, Lima'),
    ('NOVARTIS BIOSCIENCES PERU S.A.', '20100328994', '01-6321100', 'atencion@novartis.com', 'Av. Javier Prado Este 4200, Lima'),
    ('PFIZER S.A.C.', '20100283590', '01-6310000', 'peru@pfizer.com', 'Av. Canaval y Moreyra 480, Lima'),
    ('INDUMEDICA S.A.C.', '20512456778', '01-7152345', 'ventas@indumedica.com', 'Av. Nicolás Arriola 730, Lima')
on conflict (ruc) do nothing;

-- ── Laboratorios ──
insert into laboratorio (nombre, pais, tipo_entidad) values
    ('BAYER S.A.', 'PERU', 'LABORATORIO'),
    ('PFIZER S.A.C.', 'PERU', 'LABORATORIO'),
    ('SANOFI AVENTIS DEL PERU S.A.', 'PERU', 'LABORATORIO'),
    ('NOVARTIS BIOSCIENCES PERU S.A.', 'PERU', 'LABORATORIO'),
    ('ABBOTT LABORATORIOS S.A.C.', 'PERU', 'LABORATORIO'),
    ('MERCK PERUANA S.A.', 'PERU', 'LABORATORIO'),
    ('GENFAR S.A.', 'PERU', 'LABORATORIO'),
    ('A-C FARMA S.A.C.', 'PERU', 'LABORATORIO'),
    ('INDUMEDICA S.A.C.', 'PERU', 'LABORATORIO'),
    ('FARMA ANDINA E.I.R.L.', 'PERU', 'LABORATORIO')
on conflict (nombre) do nothing;

-- ── Clasificaciones ATC (DIGEMID) ──
insert into clasificacion_atc (codigo_atc, descripcion) values
    ('M01AE01', 'IBUPROFENO'),
    ('M01AE02', 'NAPROXENO'),
    ('M01AE03', 'KETOPROFENO'),
    ('M01AB15', 'KETOROLACO'),
    ('M01AB05', 'DICLOFENACO'),
    ('M01AX17', 'NIMESULIDA'),
    ('N02BB02', 'METAMIZOL SODICO'),
    ('N02AX02', 'TRAMADOL'),
    ('J01CR02', 'AMOXICILINA/ACIDO CLAVULANICO'),
    ('J01FA09', 'AZITROMICINA'),
    ('J01DB01', 'CEFALEXINA'),
    ('J01MA02', 'CIPROFLOXACINO'),
    ('J01XD01', 'METRONIDAZOL'),
    ('J01AA02', 'DOXICICLINA'),
    ('H02AB02', 'DEXAMETASONA'),
    ('H02AB07', 'PREDNISONA'),
    ('A02BC01', 'OMEPRAZOL'),
    ('A02BA02', 'RANITIDINA'),
    ('A03FA03', 'DOMPERIDONA'),
    ('A02AD01', 'ANTIACIDOS (ALUMINIO/MAGNESIO)'),
    ('A07DA03', 'LOPERAMIDA'),
    ('A03AX13', 'SIMETICONA'),
    ('A03FA01', 'METOCLOPRAMIDA'),
    ('R03AC02', 'SALBUTAMOL'),
    ('R05CB01', 'AMBROXOL'),
    ('R05DA08', 'DEXTROMETORFANO'),
    ('R05CB03', 'CARBOCISTEINA'),
    ('R01AA05', 'OXIMETAZOLINA'),
    ('R06AB04', 'CLORFENAMINA'),
    ('R06AX13', 'LORATADINA'),
    ('D01AC01', 'CLOTRIMAZOL'),
    ('D01AC02', 'MICONAZOL'),
    ('D01AE15', 'TERBINAFINA'),
    ('D07AA02', 'HIDROCORTISONA'),
    ('D06AX07', 'GENTAMICINA'),
    ('D06AX09', 'NEOMICINA/BACITRACINA'),
    ('C09AA02', 'ENALAPRIL'),
    ('C09CA01', 'LOSARTAN'),
    ('C08CA01', 'AMLODIPINO'),
    ('C07AB03', 'ATENOLOL'),
    ('B01AC06', 'ACIDO ACETILSALICILICO'),
    ('C09AA01', 'CAPTOPRIL'),
    ('S01AA01', 'CLORANFENICOL'),
    ('S01GX01', 'CROMOGLICATO'),
    ('N06BX03', 'PIRACETAM')
on conflict (codigo_atc) do nothing;

-- ── Clientes adicionales (DNI + RUC) ──
insert into cliente (tipo_documento, numero_documento, nombre_razon_social, telefono, email, direccion) values
    ('DNI', '71548963', 'Ana Torres Gómez', '965412387', 'ana.torres@example.com', 'Jr. Ucayali 200, Picota'),
    ('DNI', '42876513', 'Pedro Díaz Fernández', '921447856', 'pedro.diaz@example.com', 'Jr. Amazonas 145, Picota'),
    ('RUC', '20578964213', 'BOTICA SAN MARTIN E.I.R.L.', '984123567', 'ventas@boticasanmartin.com', 'Jr. Prado 500, Picota')
on conflict (numero_documento) do nothing;

-- =====================================================================
-- 2. PRODUCTOS (55 nuevos; referencia los catálogos por NOMBRE)
-- =====================================================================
with nuevos_productos as (
    select t.*
    from (values
        ('Dolotec 500 mg',             'Paracetamol', 'Caja', 'CADA TABLETA CONTIENE PARACETAMOL 500 mg', 'Caja con 10 tabletas', 1.50, 0.80, 30, 'ANALGESICOS', 'DROGUERIA DEL NORTE SAC', 'TABLETA', 'ORAL', 'Venta Libre', 'N02BE01', 'MERCK PERUANA S.A.', 'INDUMEDICA S.A.C.'),
        ('Ibuprofeno 400 mg',          'Ibuprofeno', 'Caja', 'CADA TABLETA CONTIENE IBUPROFENO 400 mg', 'Caja con 10 tabletas', 2.20, 1.10, 40, 'ANALGESICOS', 'DROGUERIA DEL NORTE SAC', 'TABLETA', 'ORAL', 'Venta Libre', 'M01AE01', 'MERCK PERUANA S.A.', 'INDUMEDICA S.A.C.'),
        ('Naproxeno 500 mg',           'Naproxeno', 'Caja', 'CADA TABLETA CONTIENE NAPROXENO 500 mg', 'Caja con 10 tabletas', 4.80, 2.40, 30, 'ANALGESICOS', 'GLAXOSMITHKLINE PERU S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'M01AE02', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Diclofenaco 50 mg',          'Diclofenaco', 'Caja', 'CADA TABLETA CONTIENE DICLOFENACO 50 mg', 'Caja con 20 tabletas', 3.00, 1.70, 40, 'ANALGESICOS', 'QUIMICA SUIZA S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'M01AB05', 'NOVARTIS BIOSCIENCES PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Metamizol Gotas',            'Metamizol Sódico', 'Frasco gotero', 'CADA mL CONTIENE METAMIZOL SODICO 500 mg', 'Frasco gotero x 20 mL', 4.50, 2.60, 20, 'ANALGESICOS', 'SANOFI AVENTIS DEL PERU S.A.', 'GOTAS', 'ORAL', 'Venta Bajo Receta Médica Retenida', 'N02BB02', 'SANOFI AVENTIS DEL PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Paracetamol Jarabe Infantil','Paracetamol', 'Frasco', 'CADA 5 mL CONTIENE PARACETAMOL 120 mg', 'Frasco x 60 mL', 8.90, 4.90, 15, 'ANALGESICOS', 'GLAXOSMITHKLINE PERU S.A.', 'JARABE', 'ORAL', 'Venta Libre', 'N02BE01', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Ketorolaco 30 mg Amp',       'Ketorolaco', 'Ampolla', 'CADA AMPOLLA CONTIENE KETOROLACO 30 mg/mL', 'Caja con 3 ampollas x 1 mL', 3.20, 1.60, 25, 'ANALGESICOS', 'MERCK PERUANA S.A.', 'INYECTABLE', 'INYECTABLE', 'Venta Bajo Receta Médica Retenida', 'M01AB15', 'MERCK PERUANA S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Tramadol 50 mg',             'Tramadol', 'Caja', 'CADA CAPSULA CONTIENE TRAMADOL 50 mg', 'Caja con 10 cápsulas', 6.50, 3.50, 20, 'ANALGESICOS', 'MERCK PERUANA S.A.', 'CAPSULA', 'ORAL', 'Venta Bajo Receta Médica Retenida', 'N02AX02', 'MERCK PERUANA S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Amoxicilina 250 mg/5ml',     'Amoxicilina', 'Frasco', 'CADA 5 mL CONTIENE AMOXICILINA 250 mg', 'Frasco con 60 mL', 12.00, 7.20, 12, 'ANTIBIOTICOS', 'QUIMICA SUIZA S.A.', 'SUSPENSION', 'ORAL', 'Venta Bajo Receta Médica', 'J01CA04', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Azitromicina 500 mg',        'Azitromicina', 'Caja', 'CADA CAPSULA CONTIENE AZITROMICINA 500 mg', 'Caja con 3 cápsulas', 18.00, 11.00, 10, 'ANTIBIOTICOS', 'QUIMICA SUIZA S.A.', 'CAPSULA', 'ORAL', 'Venta Bajo Receta Médica', 'J01FA09', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Cefalexina 500 mg',          'Cefalexina', 'Caja', 'CADA CAPSULA CONTIENE CEFALEXINA 500 mg', 'Caja con 12 cápsulas', 9.80, 5.30, 15, 'ANTIBIOTICOS', 'DROGUERIA DEL NORTE SAC', 'CAPSULA', 'ORAL', 'Venta Bajo Receta Médica', 'J01DB01', 'ABBOTT LABORATORIOS S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Clamoxin 875/125 mg',        'Amoxicilina/Clavulánico', 'Caja', 'CADA TABLETA CONTIENE AMOXICILINA 875 mg + ACIDO CLAVULANICO 125 mg', 'Caja con 14 tabletas', 28.50, 16.00, 10, 'ANTIBIOTICOS', 'QUIMICA SUIZA S.A.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'J01CR02', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Ciprofloxacino 500 mg',      'Ciprofloxacino', 'Caja', 'CADA TABLETA CONTIENE CIPROFLOXACINO 500 mg', 'Caja con 10 tabletas', 6.00, 3.20, 20, 'ANTIBIOTICOS', 'DROGUERIA DEL NORTE SAC', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'J01MA02', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Metronidazol 500 mg',        'Metronidazol', 'Caja', 'CADA TABLETA CONTIENE METRONIDAZOL 500 mg', 'Caja con 20 tabletas', 5.50, 3.00, 25, 'ANTIBIOTICOS', 'FARMADROGAS SAC', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'J01XD01', 'ABBOTT LABORATORIOS S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Doxiciclina 100 mg',         'Doxiciclina', 'Caja', 'CADA CAPSULA CONTIENE DOXICICLINA 100 mg', 'Caja con 10 cápsulas', 4.20, 2.30, 20, 'ANTIBIOTICOS', 'FARMADROGAS SAC', 'CAPSULA', 'ORAL', 'Venta Bajo Receta Médica', 'J01AA02', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Ibuprofeno Gel 5%',          'Ibuprofeno', 'Tubo', 'GEL CON IBUPROFENO 5%', 'Tubo x 30 g', 14.00, 8.00, 10, 'ANTIINFLAMATORIOS', 'GENFAR S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'M01AE01', 'MERCK PERUANA S.A.', 'INDUMEDICA S.A.C.'),
        ('Diclofenaco Gel 1%',         'Diclofenaco', 'Tubo', 'GEL CON DICLOFENACO 1%', 'Tubo x 30 g', 9.90, 5.30, 10, 'ANTIINFLAMATORIOS', 'NOVARTIS BIOSCIENCES PERU S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'M01AB05', 'NOVARTIS BIOSCIENCES PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Nimesulida 100 mg',          'Nimesulida', 'Caja', 'CADA TABLETA CONTIENE NIMESULIDA 100 mg', 'Caja con 10 tabletas', 6.80, 3.60, 20, 'ANTIINFLAMATORIOS', 'SANOFI AVENTIS DEL PERU S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'M01AX17', 'SANOFI AVENTIS DEL PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Ketoprofeno 100 mg',         'Ketoprofeno', 'Caja', 'CADA CAPSULA CONTIENE KETOPROFENO 100 mg', 'Caja con 10 cápsulas', 8.40, 4.50, 15, 'ANTIINFLAMATORIOS', 'BAYER S.A.', 'CAPSULA', 'ORAL', 'Venta Libre', 'M01AE03', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Dexametasona 4 mg',          'Dexametasona', 'Caja', 'CADA TABLETA CONTIENE DEXAMETASONA 4 mg', 'Caja con 20 tabletas', 7.20, 4.00, 15, 'ANTIINFLAMATORIOS', 'MERCK PERUANA S.A.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'H02AB02', 'MERCK PERUANA S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Prednisona 20 mg',           'Prednisona', 'Caja', 'CADA TABLETA CONTIENE PREDNISONA 20 mg', 'Caja con 20 tabletas', 3.80, 2.00, 20, 'ANTIINFLAMATORIOS', 'MERCK PERUANA S.A.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'H02AB07', 'MERCK PERUANA S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Naproxeno Sódico 550 mg',    'Naproxeno Sódico', 'Caja', 'CADA TABLETA CONTIENE NAPROXENO SODICO 550 mg', 'Caja con 10 tabletas', 5.60, 2.90, 20, 'ANTIINFLAMATORIOS', 'BAYER S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'M01AE02', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Omeprazol 20 mg',            'Omeprazol', 'Caja', 'CADA CAPSULA CONTIENE OMEPRAZOL 20 mg', 'Caja con 14 cápsulas', 7.50, 4.40, 20, 'GASTROINTESTINALES', 'QUIMICA SUIZA S.A.', 'CAPSULA', 'ORAL', 'Venta Libre', 'A02BC01', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Ranitidina 150 mg',          'Ranitidina', 'Caja', 'CADA TABLETA CONTIENE RANITIDINA 150 mg', 'Caja con 30 tabletas', 4.30, 2.20, 20, 'GASTROINTESTINALES', 'GLAXOSMITHKLINE PERU S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'A02BA02', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Domperidona 10 mg',          'Domperidona', 'Caja', 'CADA TABLETA CONTIENE DOMPERIDONA 10 mg', 'Caja con 30 tabletas', 6.90, 3.70, 15, 'GASTROINTESTINALES', 'SANOFI AVENTIS DEL PERU S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'A03FA03', 'SANOFI AVENTIS DEL PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Antiácido Al+Mg Susp',       'Hidróxido de Aluminio y Magnesio', 'Frasco', 'CADA 5 mL CONTIENE HIDROXIDO DE ALUMINIO 225 mg + MAGNESIO 200 mg', 'Frasco x 240 mL', 9.50, 5.10, 10, 'GASTROINTESTINALES', 'DROGUERIA DEL NORTE SAC', 'SUSPENSION', 'ORAL', 'Venta Libre', 'A02AD01', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Loperamida 2 mg',            'Loperamida', 'Caja', 'CADA TABLETA CONTIENE LOPERAMIDA 2 mg', 'Caja con 12 tabletas', 4.60, 2.50, 15, 'GASTROINTESTINALES', 'PFIZER S.A.C.', 'TABLETA', 'ORAL', 'Venta Libre', 'A07DA03', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Simeticona 100 mg',          'Simeticona', 'Caja', 'CADA TABLETA CONTIENE SIMETICONA 100 mg', 'Caja con 20 tabletas', 3.90, 2.10, 15, 'GASTROINTESTINALES', 'PFIZER S.A.C.', 'TABLETA', 'ORAL', 'Venta Libre', 'A03AX13', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Metoclopramida 10 mg',       'Metoclopramida', 'Caja', 'CADA TABLETA CONTIENE METOCLOPRAMIDA 10 mg', 'Caja con 30 tabletas', 4.10, 2.20, 15, 'GASTROINTESTINALES', 'SANOFI AVENTIS DEL PERU S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'A03FA01', 'SANOFI AVENTIS DEL PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Salbutamol Jarabe',          'Salbutamol', 'Frasco', 'CADA 5 mL CONTIENE SALBUTAMOL 2 mg', 'Frasco x 120 mL', 11.00, 6.20, 12, 'RESPIRATORIOS', 'GLAXOSMITHKLINE PERU S.A.', 'JARABE', 'ORAL', 'Venta Bajo Receta Médica', 'R03AC02', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Ambroxol Jarabe',            'Ambroxol', 'Frasco', 'CADA 5 mL CONTIENE AMBROXOL 30 mg', 'Frasco x 120 mL', 9.80, 5.40, 12, 'RESPIRATORIOS', 'GENFAR S.A.', 'JARABE', 'ORAL', 'Venta Libre', 'R05CB01', 'GENFAR S.A.', 'INDUMEDICA S.A.C.'),
        ('Dextrometorfano Jarabe',     'Dextrometorfano', 'Frasco', 'CADA 5 mL CONTIENE DEXTROMETORFANO 15 mg', 'Frasco x 120 mL', 13.50, 7.40, 10, 'RESPIRATORIOS', 'PFIZER S.A.C.', 'JARABE', 'ORAL', 'Venta Libre', 'R05DA08', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Carbocisteina 600 mg',       'Carbocisteína', 'Caja', 'CADA CAPSULA CONTIENE CARBOCISTEINA 600 mg', 'Caja con 10 cápsulas', 8.20, 4.40, 15, 'RESPIRATORIOS', 'SANOFI AVENTIS DEL PERU S.A.', 'CAPSULA', 'ORAL', 'Venta Libre', 'R05CB03', 'SANOFI AVENTIS DEL PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Oximetazolina Gotas Nasales','Oximetazolina', 'Frasco gotero', 'SOLUCION NASAL CON OXIMETAZOLINA 0.05%', 'Frasco gotero x 15 mL', 7.80, 4.10, 10, 'RESPIRATORIOS', 'GLAXOSMITHKLINE PERU S.A.', 'GOTAS', 'NASAL', 'Venta Libre', 'R01AA05', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Clorfenamina 4 mg',          'Clorfenamina', 'Caja', 'CADA TABLETA CONTIENE CLORFENAMINA 4 mg', 'Caja con 20 tabletas', 2.50, 1.50, 20, 'ANTIALERGICOS', 'PFIZER S.A.C.', 'TABLETA', 'ORAL', 'Venta Libre', 'R06AB04', 'PFIZER S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Loratadina 10 mg',           'Loratadina', 'Caja', 'CADA TABLETA CONTIENE LORATADINA 10 mg', 'Caja con 10 tabletas', 5.90, 3.20, 15, 'ANTIALERGICOS', 'GENFAR S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'R06AX13', 'GENFAR S.A.', 'INDUMEDICA S.A.C.'),
        ('Clotrimazol Crema 1%',       'Clotrimazol', 'Tubo', 'CREMA CON CLOTRIMAZOL 1%', 'Tubo x 20 g', 6.50, 3.40, 10, 'DERMATOLOGICOS', 'BAYER S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'D01AC01', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Miconazol Crema 2%',         'Miconazol', 'Tubo', 'CREMA CON MICONAZOL 2%', 'Tubo x 30 g', 9.00, 4.80, 10, 'DERMATOLOGICOS', 'BAYER S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'D01AC02', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Hidrocortisona Crema 1%',    'Hidrocortisona', 'Tubo', 'CREMA CON HIDROCORTISONA 1%', 'Tubo x 15 g', 5.40, 2.90, 10, 'DERMATOLOGICOS', 'NOVARTIS BIOSCIENCES PERU S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'D07AA02', 'NOVARTIS BIOSCIENCES PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Gentamicina Pomada 0.1%',    'Gentamicina', 'Tubo', 'POMADA CON GENTAMICINA 0.1%', 'Tubo x 15 g', 4.20, 2.30, 10, 'DERMATOLOGICOS', 'MERCK PERUANA S.A.', 'POMADA', 'TOPICA', 'Venta Bajo Receta Médica', 'D06AX07', 'MERCK PERUANA S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Neomicina/Bacitracina Pomada','Neomicina y Bacitracina', 'Tubo', 'POMADA CON NEOMICINA 5 mg/g + BACITRACINA 500 UI/g', 'Tubo x 15 g', 4.80, 2.60, 10, 'DERMATOLOGICOS', 'GLAXOSMITHKLINE PERU S.A.', 'POMADA', 'TOPICA', 'Venta Libre', 'D06AX09', 'GLAXOSMITHKLINE PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Terbinafina Crema 1%',       'Terbinafina', 'Tubo', 'CREMA CON TERBINAFINA 1%', 'Tubo x 15 g', 12.50, 6.80, 10, 'DERMATOLOGICOS', 'NOVARTIS BIOSCIENCES PERU S.A.', 'CREMA', 'TOPICA', 'Venta Libre', 'D01AE15', 'NOVARTIS BIOSCIENCES PERU S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Enalapril 10 mg',            'Enalapril', 'Caja', 'CADA TABLETA CONTIENE ENALAPRIL 10 mg', 'Caja con 30 tabletas', 6.30, 3.80, 20, 'CARDIOVASCULARES', 'FARMADROGAS SAC', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'C09AA02', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Losartán 50 mg',             'Losartán', 'Caja', 'CADA TABLETA CONTIENE LOSARTAN 50 mg', 'Caja con 30 tabletas', 7.90, 4.20, 20, 'CARDIOVASCULARES', 'A-C FARMA S.A.C.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'C09CA01', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Amlodipino 5 mg',            'Amlodipino', 'Caja', 'CADA TABLETA CONTIENE AMLODIPINO 5 mg', 'Caja con 30 tabletas', 8.10, 4.50, 20, 'CARDIOVASCULARES', 'A-C FARMA S.A.C.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'C08CA01', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Atenolol 50 mg',             'Atenolol', 'Caja', 'CADA TABLETA CONTIENE ATENOLOL 50 mg', 'Caja con 30 tabletas', 4.90, 2.70, 20, 'CARDIOVASCULARES', 'DROGUERIA PERUANA S.A.C.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'C07AB03', 'A-C FARMA S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Aspirina Protect 100 mg',    'Ácido acetilsalicílico', 'Caja', 'CADA TABLETA CONTIENE ACIDO ACETILSALICILICO 100 mg', 'Caja con 30 tabletas', 3.50, 1.90, 20, 'CARDIOVASCULARES', 'BAYER S.A.', 'TABLETA', 'ORAL', 'Venta Libre', 'B01AC06', 'BAYER S.A.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Captopril 25 mg',            'Captopril', 'Caja', 'CADA TABLETA CONTIENE CAPTOPRIL 25 mg', 'Caja con 30 tabletas', 4.40, 2.40, 20, 'CARDIOVASCULARES', 'DROGUERIA PERUANA S.A.C.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'C09AA01', 'A-C FARMA S.A.C.', 'GLAXOSMITHKLINE COSTA RICA S.A.'),
        ('Multivitamínico Jarabe',     'Multivitaminas', 'Frasco', 'COMPLEJO POLIVITAMINICO CON MINERALES', 'Frasco x 200 mL', 16.90, 9.10, 10, 'VITAMINAS Y SUPLEMENTOS', 'FARMA ANDINA E.I.R.L.', 'JARABE', 'ORAL', 'Venta Libre', NULL, 'FARMA ANDINA E.I.R.L.', 'INDUMEDICA S.A.C.'),
        ('Complejo B',                 'Vitaminas B1, B6 y B12', 'Caja', 'CADA TABLETA CONTIENE VITAMINA B1 100 mg + B6 100 mg + B12 1000 mcg', 'Caja con 30 tabletas', 7.30, 4.00, 15, 'VITAMINAS Y SUPLEMENTOS', 'FARMA ANDINA E.I.R.L.', 'TABLETA', 'ORAL', 'Venta Libre', NULL, 'FARMA ANDINA E.I.R.L.', 'INDUMEDICA S.A.C.'),
        ('Vitamina C 500 mg',          'Ácido ascórbico', 'Caja', 'CADA TABLETA CONTIENE VITAMINA C 500 mg', 'Caja con 30 tabletas', 6.10, 3.40, 15, 'VITAMINAS Y SUPLEMENTOS', 'FARMA ANDINA E.I.R.L.', 'TABLETA', 'ORAL', 'Venta Libre', NULL, 'FARMA ANDINA E.I.R.L.', 'INDUMEDICA S.A.C.'),
        ('Hierro + Ácido Fólico',      'Sulfato ferroso y ácido fólico', 'Caja', 'CADA TABLETA CONTIENE SULFATO FERROSO 300 mg + ACIDO FOLICO 400 mcg', 'Caja con 30 tabletas', 8.80, 4.70, 15, 'VITAMINAS Y SUPLEMENTOS', 'FARMA ANDINA E.I.R.L.', 'TABLETA', 'ORAL', 'Venta Libre', NULL, 'FARMA ANDINA E.I.R.L.', 'INDUMEDICA S.A.C.'),
        ('Cloranfenicol Gotas Oft',    'Cloranfenicol', 'Frasco gotero', 'SOLUCION OFTALMICA CON CLORANFENICOL 0.5%', 'Frasco gotero x 10 mL', 6.70, 3.60, 10, 'OFTALMICOS', 'A-C FARMA S.A.C.', 'GOTAS', 'OFTALMICA', 'Venta Bajo Receta Médica', 'S01AA01', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Cromoglicato Gotas Oft',     'Cromoglicato', 'Frasco gotero', 'SOLUCION OFTALMICA CON CROMOGLICATO 2%', 'Frasco gotero x 10 mL', 11.80, 6.40, 10, 'OFTALMICOS', 'A-C FARMA S.A.C.', 'GOTAS', 'OFTALMICA', 'Venta Bajo Receta Médica', 'S01GX01', 'A-C FARMA S.A.C.', 'INDUMEDICA S.A.C.'),
        ('Piracetam 800 mg',           'Piracetam', 'Caja', 'CADA TABLETA CONTIENE PIRACETAM 800 mg', 'Caja con 30 tabletas', 15.20, 8.20, 15, 'NEUROLOGICOS', 'INDUMEDICA S.A.C.', 'TABLETA', 'ORAL', 'Venta Bajo Receta Médica', 'N06BX03', 'INDUMEDICA S.A.C.', 'INDUMEDICA S.A.C.')
    ) as t (nombre_comercial, nombre_generico, unidad_medida, composicion, presentacion, precio_venta, costo_referencial, stock_minimo_alerta, categoria_nombre, proveedor_nombre, forma_nombre, via_nombre, condicion_nombre, codigo_atc, titular_nombre, fabricante_nombre)
    where not exists (select 1 from producto p where p.nombre_comercial = t.nombre_comercial)
)
insert into producto (
    nombre_comercial, nombre_generico, unidad_medida, composicion, presentacion,
    precio_venta, costo_referencial, stock_minimo_alerta, imagen_url,
    id_categoria, id_proveedor, id_forma_farmaceutica, id_via_administracion,
    id_condicion_venta, codigo_atc, id_laboratorio_titular, id_fabricante
)
select
    n.nombre_comercial,
    n.nombre_generico,
    n.unidad_medida,
    n.composicion,
    n.presentacion,
    n.precio_venta,
    n.costo_referencial,
    n.stock_minimo_alerta,
    null,
    (select id_categoria        from categoria      where nombre_categoria = n.categoria_nombre),
    (select id_proveedor       from proveedor      where nombre_proveedor = n.proveedor_nombre),
    (select id_forma_farmaceutica from forma_farmaceutica where nombre = n.forma_nombre),
    (select id_via_administracion from via_administracion where nombre = n.via_nombre),
    (select id_condicion_venta from condicion_venta where nombre = n.condicion_nombre),
    n.codigo_atc,
    (select id_laboratorio     from laboratorio    where nombre = n.titular_nombre),
    (select id_laboratorio     from laboratorio    where nombre = n.fabricante_nombre)
from nuevos_productos n;

-- =====================================================================
-- 3. REGISTRO SANITARIO (número RS + fecha de vencimiento del RS)
-- =====================================================================
insert into registro_sanitario (id_producto, numero_rs, rs_anterior, fecha_vencimiento, estado_rs, fecha_consulta)
select
    (select id_producto from producto p where p.nombre_comercial = r.nombre_comercial),
    r.numero_rs,
    null,
    r.fecha_vencimiento,
    'VIGENTE',
    now()
from (values
    ('Dolotec 500 mg',             'EE-2024-0001-A', date '2027-12-31'),
    ('Ibuprofeno 400 mg',          'EE-2024-0002-A', date '2027-10-20'),
    ('Naproxeno 500 mg',           'EE-2024-0003-A', date '2027-06-15'),
    ('Diclofenaco 50 mg',          'EE-2024-0004-A', date '2027-08-05'),
    ('Metamizol Gotas',            'EE-2024-0005-A', date '2026-12-31'),
    ('Paracetamol Jarabe Infantil','EE-2024-0006-A', date '2027-11-20'),
    ('Ketorolaco 30 mg Amp',       'EE-2024-0007-A', date '2026-11-30'),
    ('Tramadol 50 mg',             'EE-2024-0008-A', date '2027-09-10'),
    ('Amoxicilina 250 mg/5ml',     'EE-2024-0009-A', date '2027-04-30'),
    ('Azitromicina 500 mg',        'EE-2024-0010-A', date '2027-07-25'),
    ('Cefalexina 500 mg',          'EE-2024-0011-A', date '2027-03-12'),
    ('Clamoxin 875/125 mg',        'EE-2024-0012-A', date '2027-01-18'),
    ('Ciprofloxacino 500 mg',      'EE-2024-0013-A', date '2027-05-08'),
    ('Metronidazol 500 mg',        'EE-2024-0014-A', date '2027-02-14'),
    ('Doxiciclina 100 mg',         'EE-2024-0015-A', date '2026-10-31'),
    ('Ibuprofeno Gel 5%',          'EE-2024-0016-A', date '2027-06-30'),
    ('Diclofenaco Gel 1%',         'EE-2024-0017-A', date '2027-08-22'),
    ('Nimesulida 100 mg',          'EE-2024-0018-A', date '2026-12-15'),
    ('Ketoprofeno 100 mg',         'EE-2024-0019-A', date '2027-04-05'),
    ('Dexametasona 4 mg',          'EE-2024-0020-A', date '2027-07-01'),
    ('Prednisona 20 mg',           'EE-2024-0021-A', date '2027-09-30'),
    ('Naproxeno Sódico 550 mg',    'EE-2024-0022-A', date '2027-03-28'),
    ('Omeprazol 20 mg',            'EE-2024-0023-A', date '2027-12-15'),
    ('Ranitidina 150 mg',          'EE-2024-0024-A', date '2027-02-20'),
    ('Domperidona 10 mg',          'EE-2024-0025-A', date '2027-06-10'),
    ('Antiácido Al+Mg Susp',       'EE-2024-0026-A', date '2026-12-01'),
    ('Loperamida 2 mg',            'EE-2024-0027-A', date '2027-10-05'),
    ('Simeticona 100 mg',          'EE-2024-0028-A', date '2027-05-25'),
    ('Metoclopramida 10 mg',       'EE-2024-0029-A', date '2027-08-18'),
    ('Salbutamol Jarabe',          'EE-2024-0030-A', date '2027-03-15'),
    ('Ambroxol Jarabe',            'EE-2024-0031-A', date '2027-09-09'),
    ('Dextrometorfano Jarabe',     'EE-2024-0032-A', date '2027-01-30'),
    ('Carbocisteina 600 mg',       'EE-2024-0033-A', date '2027-11-11'),
    ('Oximetazolina Gotas Nasales','EE-2024-0034-A', date '2027-04-22'),
    ('Clorfenamina 4 mg',          'EE-2024-0035-A', date '2027-02-02'),
    ('Loratadina 10 mg',           'EE-2024-0036-A', date '2027-12-01'),
    ('Clotrimazol Crema 1%',       'EE-2024-0037-A', date '2027-05-18'),
    ('Miconazol Crema 2%',         'EE-2024-0038-A', date '2027-07-14'),
    ('Hidrocortisona Crema 1%',    'EE-2024-0039-A', date '2026-10-20'),
    ('Gentamicina Pomada 0.1%',    'EE-2024-0040-A', date '2027-06-05'),
    ('Neomicina/Bacitracina Pomada','EE-2024-0041-A', date '2027-08-30'),
    ('Terbinafina Crema 1%',       'EE-2024-0042-A', date '2027-09-25'),
    ('Enalapril 10 mg',            'EE-2024-0043-A', date '2027-03-20'),
    ('Losartán 50 mg',             'EE-2024-0044-A', date '2027-12-20'),
    ('Amlodipino 5 mg',            'EE-2024-0045-A', date '2027-10-28'),
    ('Atenolol 50 mg',             'EE-2024-0046-A', date '2027-04-12'),
    ('Aspirina Protect 100 mg',    'EE-2024-0047-A', date '2027-11-30'),
    ('Captopril 25 mg',            'EE-2024-0048-A', date '2027-01-25'),
    ('Multivitamínico Jarabe',     'EE-2024-0049-A', date '2027-07-19'),
    ('Complejo B',                 'EE-2024-0050-A', date '2027-09-02'),
    ('Vitamina C 500 mg',          'EE-2024-0051-A', date '2028-01-15'),
    ('Hierro + Ácido Fólico',      'EE-2024-0052-A', date '2027-05-30'),
    ('Cloranfenicol Gotas Oft',    'EE-2024-0053-A', date '2026-11-28'),
    ('Cromoglicato Gotas Oft',     'EE-2024-0054-A', date '2027-08-08'),
    ('Piracetam 800 mg',           'EE-2024-0055-A', date '2027-04-18')
) as r (nombre_comercial, numero_rs, fecha_vencimiento)
where not exists (
    select 1 from registro_sanitario rs
    where rs.id_producto = (select id_producto from producto p where p.nombre_comercial = r.nombre_comercial)
);

-- =====================================================================
-- 4. INVENTARIO LOTE — con FECHA DE VENCIMIENTO, costo y stock
-- =====================================================================
-- Nota: el stock ya considera las unidades vendidas en la sección 5,
-- para que el script sea idempotente (no se descuenta después).
insert into inventario_lote (id_producto, numero_lote, fecha_vencimiento, fecha_ingreso, costo_unitario_compra, stock_lote, ubicacion_estante, estado_logico)
select
    (select id_producto from producto p where p.nombre_comercial = l.nombre_comercial),
    l.numero_lote,
    l.fecha_vencimiento,
    now(),
    l.costo_unitario_compra,
    l.stock_lote,
    l.ubicacion_estante,
    true
from (values
    ('Dolotec 500 mg',             'LOTE-DOLO',  date '2027-01-10', 0.80, 201, 'Estante A1'),
    ('Dolotec 500 mg',             'LOTE-DOLO2', date '2027-06-01', 0.80, 100, 'Estante A1'),
    ('Ibuprofeno 400 mg',          'LOTE-IBUP',  date '2026-12-20', 1.10, 122, 'Estante A2'),
    ('Naproxeno 500 mg',           'LOTE-NAPR',  date '2027-03-15', 2.40, 90,  'Estante A3'),
    ('Diclofenaco 50 mg',          'LOTE-DICL',  date '2026-11-30', 1.70, 152, 'Estante A4'),
    ('Metamizol Gotas',            'LOTE-META',  date '2027-01-30', 2.60, 41,  'Estante A5'),
    ('Metamizol Gotas',            'LOTE-META2', date '2026-11-10', 2.60, 60,  'Estante A5'),
    ('Paracetamol Jarabe Infantil','LOTE-PJAR',  date '2027-03-10', 4.90, 32,  'Estante B1'),
    ('Ketorolaco 30 mg Amp',       'LOTE-KETO',  date '2026-12-01', 1.60, 121, 'Estante A6'),
    ('Tramadol 50 mg',             'LOTE-TRAM',  date '2027-11-18', 3.50, 62,  'Estante C1'),
    ('Amoxicilina 250 mg/5ml',     'LOTE-AMOX',  date '2026-11-15', 7.20, 27,  'Estante B2'),
    ('Azitromicina 500 mg',        'LOTE-AZITRO',date '2027-08-15', 11.00, 47, 'Estante C2'),
    ('Cefalexina 500 mg',          'LOTE-CEFA',  date '2027-02-28', 5.30, 85,  'Estante C3'),
    ('Clamoxin 875/125 mg',        'LOTE-AMOXCL',date '2027-03-08', 16.00, 31, 'Estante C4'),
    ('Ciprofloxacino 500 mg',      'LOTE-CIPRO', date '2027-05-20', 3.20, 95,  'Estante C5'),
    ('Metronidazol 500 mg',        'LOTE-METRO', date '2027-04-12', 3.00, 80,  'Estante C6'),
    ('Doxiciclina 100 mg',         'LOTE-DOXI',  date '2026-10-31', 2.30, 70,  'Estante C7'),
    ('Ibuprofeno Gel 5%',          'LOTE-IBUPG', date '2027-07-05', 8.00, 45,  'Estante D1'),
    ('Diclofenaco Gel 1%',         'LOTE-DICLG', date '2027-03-25', 5.30, 46,  'Estante D2'),
    ('Nimesulida 100 mg',          'LOTE-NIME',  date '2026-12-15', 3.60, 60,  'Estante A7'),
    ('Ketoprofeno 100 mg',         'LOTE-KETOP', date '2027-06-20', 4.50, 55,  'Estante A8'),
    ('Dexametasona 4 mg',          'LOTE-DEXA',  date '2027-01-20', 4.00, 86,  'Estante A9'),
    ('Prednisona 20 mg',           'LOTE-PRED',  date '2027-05-10', 2.00, 70,  'Estante A10'),
    ('Naproxeno Sódico 550 mg',    'LOTE-NAPS',  date '2027-02-05', 2.90, 75,  'Estante A11'),
    ('Omeprazol 20 mg',            'LOTE-OMEP',  date '2027-09-30', 4.40, 141, 'Estante E1'),
    ('Ranitidina 150 mg',          'LOTE-RANI',  date '2027-06-25', 2.20, 90,  'Estante E2'),
    ('Domperidona 10 mg',          'LOTE-DOMP',  date '2027-04-01', 3.70, 65,  'Estante E3'),
    ('Antiácido Al+Mg Susp',       'LOTE-ALMG',  date '2026-11-05', 5.10, 35,  'Estante E4'),
    ('Loperamida 2 mg',            'LOTE-LOPE',  date '2027-08-08', 2.50, 60,  'Estante E5'),
    ('Simeticona 100 mg',          'LOTE-SIME',  date '2026-10-25', 2.10, 71,  'Estante E6'),
    ('Metoclopramida 10 mg',       'LOTE-METOC', date '2027-03-30', 2.20, 55,  'Estante E7'),
    ('Salbutamol Jarabe',          'LOTE-SALB',  date '2027-07-20', 6.20, 51,  'Estante B3'),
    ('Ambroxol Jarabe',            'LOTE-AMBRO', date '2027-05-15', 5.40, 40,  'Estante B4'),
    ('Dextrometorfano Jarabe',     'LOTE-DEXTRO',date '2027-05-15', 7.40, 41,  'Estante B5'),
    ('Carbocisteina 600 mg',       'LOTE-CARBO', date '2027-09-12', 4.40, 55,  'Estante E8'),
    ('Oximetazolina Gotas Nasales','LOTE-OXIM',  date '2027-04-22', 4.10, 30,  'Estante F1'),
    ('Clorfenamina 4 mg',          'LOTE-CLOR',  date '2027-02-28', 1.50, 61,  'Estante F2'),
    ('Loratadina 10 mg',           'LOTE-LORA',  date '2026-12-05', 3.20, 81,  'Estante F3'),
    ('Clotrimazol Crema 1%',       'LOTE-CLOT',  date '2027-10-10', 3.40, 61,  'Estante D3'),
    ('Miconazol Crema 2%',         'LOTE-MICO',  date '2027-08-14', 4.80, 45,  'Estante D4'),
    ('Hidrocortisona Crema 1%',    'LOTE-HIDRO', date '2026-10-20', 2.90, 40,  'Estante D5'),
    ('Gentamicina Pomada 0.1%',    'LOTE-GENT',  date '2027-06-05', 2.30, 50,  'Estante D6'),
    ('Neomicina/Bacitracina Pomada','LOTE-NEOB', date '2027-08-30', 2.60, 45,  'Estante D7'),
    ('Terbinafina Crema 1%',       'LOTE-TERB',  date '2027-08-01', 6.80, 36,  'Estante D8'),
    ('Enalapril 10 mg',            'LOTE-ENAL',  date '2027-06-30', 3.80, 91,  'Estante G1'),
    ('Losartán 50 mg',             'LOTE-LOSA',  date '2027-06-10', 4.20, 96,  'Estante G2'),
    ('Amlodipino 5 mg',            'LOTE-AMLO',  date '2027-04-05', 4.50, 101, 'Estante G3'),
    ('Atenolol 50 mg',             'LOTE-ATEN',  date '2027-07-12', 2.70, 80,  'Estante G4'),
    ('Aspirina Protect 100 mg',    'LOTE-AASP',  date '2027-12-12', 1.90, 110, 'Estante G5'),
    ('Captopril 25 mg',            'LOTE-CAPT',  date '2027-05-05', 2.40, 90,  'Estante G6'),
    ('Multivitamínico Jarabe',     'LOTE-MULTI', date '2027-02-14', 9.10, 41,  'Estante H1'),
    ('Complejo B',                 'LOTE-COMPB', date '2027-09-15', 4.00, 111, 'Estante H2'),
    ('Vitamina C 500 mg',          'LOTE-VITC',  date '2027-12-31', 3.40, 131, 'Estante H3'),
    ('Hierro + Ácido Fólico',      'LOTE-HIERRO',date '2027-10-01', 4.70, 80,  'Estante H4'),
    ('Cloranfenicol Gotas Oft',    'LOTE-CLOFT', date '2026-11-28', 3.60, 35,  'Estante F4'),
    ('Cromoglicato Gotas Oft',     'LOTE-CROM',  date '2027-08-08', 6.40, 30,  'Estante F5'),
    ('Piracetam 800 mg',           'LOTE-PIRA',  date '2027-04-18', 8.20, 50,  'Estante G7'),
    ('Paracetamol 500 mg Genfar',  'LOTE-PARAG', date '2027-04-30', 0.30, 105, 'Estante A12')
) as l (nombre_comercial, numero_lote, fecha_vencimiento, costo_unitario_compra, stock_lote, ubicacion_estante)
where not exists (
    select 1 from inventario_lote il
    where il.numero_lote = l.numero_lote
      and il.id_producto = (select id_producto from producto p where p.nombre_comercial = l.nombre_comercial)
);

-- =====================================================================
-- 5. VENTAS realizadas por vendedor@botica.com
-- =====================================================================

-- ── 5.1 Cabeceras de venta (id_usuario resuelto por email) ──
insert into venta (id_venta, fecha_venta, id_cliente, id_usuario, id_metodo_pago, tipo_comprobante, total_pagar, monto_pagado, estado_venta)
select
    v.id_venta,
    v.fecha_venta,
    (select c.id_cliente from cliente c where c.numero_documento = v.numero_documento),
    (select u.id_usuario from usuario u where u.email = 'vendedor@botica.com'),
    v.id_metodo_pago,
    v.tipo_comprobante,
    v.total_pagar,
    v.monto_pagado,
    'PAGADA'
from (values
    (5101, timestamp '2026-09-05 09:12', NULL,        1, 'BOLETA',  26.90, 30.00),
    (5102, timestamp '2026-09-05 11:40', '45678912',  3, 'BOLETA',   8.90, 10.00),
    (5103, timestamp '2026-09-06 08:30', '20123456789', 2, 'FACTURA', 30.30, 30.30),
    (5104, timestamp '2026-09-06 15:05', NULL,        1, 'BOLETA',   8.40, 10.00),
    (5105, timestamp '2026-09-08 10:22', '45678912',  1, 'BOLETA',  11.40, 20.00),
    (5106, timestamp '2026-09-09 09:48', NULL,        1, 'TICKET',   4.05,  5.00),
    (5107, timestamp '2026-09-10 12:15', '45678912',  2, 'BOLETA',  24.50, 24.50),
    (5108, timestamp '2026-09-11 16:33', NULL,        3, 'BOLETA',  19.00, 19.00),
    (5109, timestamp '2026-09-12 10:05', '45678912',  1, 'BOLETA',  15.90, 20.00),
    (5110, timestamp '2026-09-15 09:30', NULL,        1, 'BOLETA',  30.30, 30.30),
    (5111, timestamp '2026-09-16 11:50', '45678912',  2, 'BOLETA',  16.00, 16.00),
    (5112, timestamp '2026-09-18 14:20', NULL,        1, 'BOLETA',  10.40, 12.00),
    (5113, timestamp '2026-09-20 09:45', '20123456789', 4, 'FACTURA', 41.50, 41.50)
) as v (id_venta, fecha_venta, numero_documento, id_metodo_pago, tipo_comprobante, total_pagar, monto_pagado)
where not exists (select 1 from venta x where x.id_venta = v.id_venta);

-- ── 5.2 Detalle de venta ──
insert into detalle_venta (id_detalle_venta, id_venta, id_producto, cantidad, precio_unitario_venta)
select
    d.id_detalle_venta,
    d.id_venta,
    (select p.id_producto from producto p where p.nombre_comercial = d.nombre_comercial),
    d.cantidad,
    d.precio_unitario_venta
from (values
    (51101, 5101, 'Azitromicina 500 mg',          1, 18.00),
    (51102, 5101, 'Paracetamol Jarabe Infantil',  1,  8.90),
    (51103, 5102, 'Ibuprofeno 400 mg',            2,  2.20),
    (51104, 5102, 'Metamizol Gotas',              1,  4.50),
    (51105, 5103, 'Amoxicilina 250 mg/5ml',       2, 12.00),
    (51106, 5103, 'Enalapril 10 mg',              1,  6.30),
    (51107, 5104, 'Loratadina 10 mg',             1,  5.90),
    (51108, 5104, 'Clorfenamina 4 mg',            1,  2.50),
    (51109, 5105, 'Omeprazol 20 mg',              1,  7.50),
    (51110, 5105, 'Simeticona 100 mg',            1,  3.90),
    (51111, 5106, 'Paracetamol 500 mg Genfar',    5,  0.51),
    (51112, 5106, 'Dolotec 500 mg',               1,  1.50),
    (51113, 5107, 'Salbutamol Jarabe',            1, 11.00),
    (51114, 5107, 'Dextrometorfano Jarabe',       1, 13.50),
    (51115, 5108, 'Clotrimazol Crema 1%',         1,  6.50),
    (51116, 5108, 'Terbinafina Crema 1%',         1, 12.50),
    (51117, 5109, 'Diclofenaco 50 mg',            2,  3.00),
    (51118, 5109, 'Diclofenaco Gel 1%',           1,  9.90),
    (51119, 5110, 'Vitamina C 500 mg',            1,  6.10),
    (51120, 5110, 'Complejo B',                   1,  7.30),
    (51121, 5110, 'Multivitamínico Jarabe',       1, 16.90),
    (51122, 5111, 'Amlodipino 5 mg',              1,  8.10),
    (51123, 5111, 'Losartán 50 mg',               1,  7.90),
    (51124, 5112, 'Ketorolaco 30 mg Amp',         1,  3.20),
    (51125, 5112, 'Dexametasona 4 mg',            1,  7.20),
    (51126, 5113, 'Tramadol 50 mg',               2,  6.50),
    (51127, 5113, 'Clamoxin 875/125 mg',          1, 28.50)
) as d (id_detalle_venta, id_venta, nombre_comercial, cantidad, precio_unitario_venta)
where not exists (select 1 from detalle_venta x where x.id_detalle_venta = d.id_detalle_venta);

-- ── 5.3 Salida de lote por cada detalle vendido ──
insert into detalle_venta_lote (id_detalle_venta_lote, id_detalle_venta, id_inventario, cantidad)
select
    dvl.id_detalle_venta_lote,
    dvl.id_detalle_venta,
    (select il.id_inventario
     from inventario_lote il
     where il.id_producto = (select id_producto from producto p where p.nombre_comercial = dvl.nombre_comercial)
       and il.numero_lote = dvl.numero_lote),
    dvl.cantidad
from (values
    (51201, 51101, 'Azitromicina 500 mg',           'LOTE-AZITRO',  1),
    (51202, 51102, 'Paracetamol Jarabe Infantil',   'LOTE-PJAR',    1),
    (51203, 51103, 'Ibuprofeno 400 mg',             'LOTE-IBUP',    2),
    (51204, 51104, 'Metamizol Gotas',               'LOTE-META',    1),
    (51205, 51105, 'Amoxicilina 250 mg/5ml',        'LOTE-AMOX',    2),
    (51206, 51106, 'Enalapril 10 mg',               'LOTE-ENAL',    1),
    (51207, 51107, 'Loratadina 10 mg',              'LOTE-LORA',    1),
    (51208, 51108, 'Clorfenamina 4 mg',             'LOTE-CLOR',    1),
    (51209, 51109, 'Omeprazol 20 mg',               'LOTE-OMEP',    1),
    (51210, 51110, 'Simeticona 100 mg',             'LOTE-SIME',    1),
    (51211, 51111, 'Paracetamol 500 mg Genfar',     'LOTE-PARAG',   5),
    (51212, 51112, 'Dolotec 500 mg',                'LOTE-DOLO',    1),
    (51213, 51113, 'Salbutamol Jarabe',             'LOTE-SALB',    1),
    (51214, 51114, 'Dextrometorfano Jarabe',        'LOTE-DEXTRO',  1),
    (51215, 51115, 'Clotrimazol Crema 1%',          'LOTE-CLOT',    1),
    (51216, 51116, 'Terbinafina Crema 1%',          'LOTE-TERB',    1),
    (51217, 51117, 'Diclofenaco 50 mg',             'LOTE-DICL',    2),
    (51218, 51118, 'Diclofenaco Gel 1%',            'LOTE-DICLG',   1),
    (51219, 51119, 'Vitamina C 500 mg',             'LOTE-VITC',    1),
    (51220, 51120, 'Complejo B',                    'LOTE-COMPB',   1),
    (51221, 51121, 'Multivitamínico Jarabe',        'LOTE-MULTI',   1),
    (51222, 51122, 'Amlodipino 5 mg',               'LOTE-AMLO',    1),
    (51223, 51123, 'Losartán 50 mg',                'LOTE-LOSA',    1),
    (51224, 51124, 'Ketorolaco 30 mg Amp',          'LOTE-KETO',    1),
    (51225, 51125, 'Dexametasona 4 mg',             'LOTE-DEXA',    1),
    (51226, 51126, 'Tramadol 50 mg',                'LOTE-TRAM',    2),
    (51227, 51127, 'Clamoxin 875/125 mg',           'LOTE-AMOXCL',  1)
) as dvl (id_detalle_venta_lote, id_detalle_venta, nombre_comercial, numero_lote, cantidad)
where not exists (select 1 from detalle_venta_lote x where x.id_detalle_venta_lote = dvl.id_detalle_venta_lote);

-- =====================================================================
-- 6. MOVIMIENTOS DE INVENTARIO (1 COMPRA + 13 VENTAS) y sus detalles
-- =====================================================================

-- ── 6.1 Movimientos ──
insert into movimiento (id_movimiento, tipo_movimiento, fecha_hora, id_usuario, id_proveedor, numero_documento, subtotal, igv, total, motivo_ajuste)
select
    m.id_movimiento,
    m.tipo_movimiento,
    m.fecha_hora,
    (select u.id_usuario from usuario u where u.email = m.email_usuario),
    (select pr.id_proveedor from proveedor pr where pr.nombre_proveedor = m.proveedor_nombre),
    nullif(m.numero_documento, ''),
    m.subtotal,
    m.igv,
    m.total,
    m.motivo_ajuste
from (values
    (51300, 'COMPRA', timestamp '2026-09-01 08:30', 'almacenero@botica.com', 'QUIMICA SUIZA S.A.', 'F001-0000123', 1271.60, 228.89, 1500.49, 'Ingreso inicial de mercadería'),
    (51301, 'VENTA',  timestamp '2026-09-05 09:12', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51302, 'VENTA',  timestamp '2026-09-05 11:40', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51303, 'VENTA',  timestamp '2026-09-06 08:30', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51304, 'VENTA',  timestamp '2026-09-06 15:05', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51305, 'VENTA',  timestamp '2026-09-08 10:22', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51306, 'VENTA',  timestamp '2026-09-09 09:48', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51307, 'VENTA',  timestamp '2026-09-10 12:15', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51308, 'VENTA',  timestamp '2026-09-11 16:33', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51309, 'VENTA',  timestamp '2026-09-12 10:05', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51310, 'VENTA',  timestamp '2026-09-15 09:30', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51311, 'VENTA',  timestamp '2026-09-16 11:50', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51312, 'VENTA',  timestamp '2026-09-18 14:20', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL),
    (51313, 'VENTA',  timestamp '2026-09-20 09:45', 'vendedor@botica.com',   NULL, '', NULL, NULL, NULL, NULL)
) as m (id_movimiento, tipo_movimiento, fecha_hora, email_usuario, proveedor_nombre, numero_documento, subtotal, igv, total, motivo_ajuste)
where not exists (select 1 from movimiento x where x.id_movimiento = m.id_movimiento);

-- ── 6.2 Detalle de movimientos ──
insert into detalle_movimiento (id_detalle_mov, id_movimiento, id_producto, id_inventario, cantidad, costo_unitario)
select
    dm.id_detalle_mov,
    dm.id_movimiento,
    (select p.id_producto from producto p where p.nombre_comercial = dm.nombre_comercial),
    (select il.id_inventario
     from inventario_lote il
     where il.id_producto = (select id_producto from producto p where p.nombre_comercial = dm.nombre_comercial)
       and il.numero_lote = dm.numero_lote),
    dm.cantidad,
    dm.costo_unitario
from (values
    (51400, 51300, 'Azitromicina 500 mg',           'LOTE-AZITRO',  47, 11.00),
    (51401, 51300, 'Ibuprofeno 400 mg',             'LOTE-IBUP',   122,  1.10),
    (51402, 51300, 'Omeprazol 20 mg',               'LOTE-OMEP',   141,  4.40),
    (51403, 51301, 'Azitromicina 500 mg',           'LOTE-AZITRO',   1, 11.00),
    (51404, 51301, 'Paracetamol Jarabe Infantil',   'LOTE-PJAR',     1,  4.90),
    (51405, 51302, 'Ibuprofeno 400 mg',             'LOTE-IBUP',     2,  1.10),
    (51406, 51302, 'Metamizol Gotas',               'LOTE-META',     1,  2.60),
    (51407, 51303, 'Amoxicilina 250 mg/5ml',        'LOTE-AMOX',     2,  7.20),
    (51408, 51303, 'Enalapril 10 mg',               'LOTE-ENAL',     1,  3.80),
    (51409, 51304, 'Loratadina 10 mg',              'LOTE-LORA',     1,  3.20),
    (51410, 51304, 'Clorfenamina 4 mg',             'LOTE-CLOR',     1,  1.50),
    (51411, 51305, 'Omeprazol 20 mg',               'LOTE-OMEP',     1,  4.40),
    (51412, 51305, 'Simeticona 100 mg',             'LOTE-SIME',     1,  2.10),
    (51413, 51306, 'Paracetamol 500 mg Genfar',     'LOTE-PARAG',    5,  0.30),
    (51414, 51306, 'Dolotec 500 mg',                'LOTE-DOLO',     1,  0.80),
    (51415, 51307, 'Salbutamol Jarabe',             'LOTE-SALB',     1,  6.20),
    (51416, 51307, 'Dextrometorfano Jarabe',        'LOTE-DEXTRO',   1,  7.40),
    (51417, 51308, 'Clotrimazol Crema 1%',          'LOTE-CLOT',     1,  3.40),
    (51418, 51308, 'Terbinafina Crema 1%',          'LOTE-TERB',     1,  6.80),
    (51419, 51309, 'Diclofenaco 50 mg',             'LOTE-DICL',     2,  1.70),
    (51420, 51309, 'Diclofenaco Gel 1%',            'LOTE-DICLG',    1,  5.30),
    (51421, 51310, 'Vitamina C 500 mg',             'LOTE-VITC',     1,  3.40),
    (51422, 51310, 'Complejo B',                    'LOTE-COMPB',    1,  4.00),
    (51423, 51310, 'Multivitamínico Jarabe',        'LOTE-MULTI',    1,  9.10),
    (51424, 51311, 'Amlodipino 5 mg',               'LOTE-AMLO',     1,  4.50),
    (51425, 51311, 'Losartán 50 mg',                'LOTE-LOSA',     1,  4.20),
    (51426, 51312, 'Ketorolaco 30 mg Amp',          'LOTE-KETO',     1,  1.60),
    (51427, 51312, 'Dexametasona 4 mg',             'LOTE-DEXA',     1,  4.00),
    (51428, 51313, 'Tramadol 50 mg',                'LOTE-TRAM',     2,  3.50),
    (51429, 51313, 'Clamoxin 875/125 mg',           'LOTE-AMOXCL',   1, 16.00)
) as dm (id_detalle_mov, id_movimiento, nombre_comercial, numero_lote, cantidad, costo_unitario)
where not exists (select 1 from detalle_movimiento x where x.id_detalle_mov = dm.id_detalle_mov);

commit;

-- =====================================================================
-- VERIFICACIÓN (opcional)
-- =====================================================================
-- select 'productos' as registro, count(*) as total from producto
-- union all select 'lotes', count(*) from inventario_lote
-- union all select 'registros_sanitarios', count(*) from registro_sanitario
-- union all select 'ventas', count(*) from venta
-- union all select 'detalle_venta', count(*) from detalle_venta
-- union all select 'detalle_venta_lote', count(*) from detalle_venta_lote
-- union all select 'movimientos', count(*) from movimiento
-- union all select 'detalle_movimiento', count(*) from detalle_movimiento;

-- -- Stock real por producto top (vista que usa el backend)
-- select p.id_producto, p.nombre_comercial, v.stock_total_actual, v.alerta_stock_bajo
-- from vista_stock_producto v
-- join producto p on p.id_producto = v.id_producto
-- order by p.id_producto
-- limit 60;

-- -- Ventas del vendedor vendedor@botica.com
-- select ve.id_venta, ve.fecha_venta, ve.tipo_comprobante, ve.total_pagar, u.email, mp.nombre_metodo
-- from venta ve
-- join usuario u on u.id_usuario = ve.id_usuario
-- join metodo_pago mp on mp.id_metodo_pago = ve.id_metodo_pago
-- where u.email = 'vendedor@botica.com'
-- order by ve.fecha_venta;