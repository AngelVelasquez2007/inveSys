"""Seed script — limpia la BD y crea datos de prueba para una charcutería."""

import os
import sys
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv()

import psycopg
from psycopg import sql
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')

# ── Config ─────────────────────────────────────────
DB_URL = (
    os.getenv('DATABASE_URL')
    or 'postgresql://postgres:*06022007@localhost:5432/invesys'
)
SEP = '-' * 60


def get_conn():
    return psycopg.connect(DB_URL)


def truncate_all(cur):
    tables = [
        'orden_items', 'ordenes_venta', 'movimientos_inventario',
        'producto_proveedor', 'productos', 'clientes',
        'proveedores', 'categorias', 'usuarios',
        'sucursales', 'empresas', 'auditoria',
        'mensaje_sucursal', 'mensajes',
        'descuento_sucursal', 'descuentos',
    ]
    for t in tables:
        cur.execute(sql.SQL('TRUNCATE TABLE {} RESTART IDENTITY CASCADE').format(sql.Identifier(t)))


def main():
    print('Limpiando datos existentes…')
    with get_conn() as conn:
        with conn.cursor() as cur:
            truncate_all(cur)
            conn.commit()
            print('  [OK] Tablas truncadas')

            # ─── Configuración ───────────────────────────
            cur.execute(
                "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                ('nombre_plataforma', 'InveSys'),
            )
            cur.execute(
                "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                ('moneda_simbolo', '$'),
            )
            cur.execute(
                "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                ('moneda_codigo', 'COP'),
            )

            # ─── Empresa ─────────────────────────────────
            cur.execute(
                "INSERT INTO empresas (nombre, codigo_admin) VALUES (%s, %s) RETURNING id",
                ('Charcutería El Artesano S.A.S.', 'ARTE2026'),
            )
            empresa_id = cur.fetchone()[0]

            # ─── Sucursales ──────────────────────────────
            cur.execute(
                "INSERT INTO sucursales (nombre, empresa_id) VALUES (%s, %s) RETURNING id",
                ('Sucursal Centro', empresa_id),
            )
            suc1_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO sucursales (nombre, empresa_id) VALUES (%s, %s) RETURNING id",
                ('Sucursal Norte', empresa_id),
            )
            suc2_id = cur.fetchone()[0]

            # ─── Usuarios ────────────────────────────────
            hash_admin = pwd_context.hash('Admin123!')
            cur.execute(
                """INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id)
                   VALUES (%s, %s, %s, 'ADMIN', %s) RETURNING id""",
                ('Admin Charcutería', 'admin@charcuteria.com', hash_admin, empresa_id),
            )
            admin_id = cur.fetchone()[0]
            cur.execute('UPDATE empresas SET usuario_admin_id=%s WHERE id=%s', (admin_id, empresa_id))

            hash_oper = pwd_context.hash('Admin123!')
            cur.execute(
                """INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id, sucursal_id)
                   VALUES (%s, %s, %s, 'OPERADOR', %s, %s) RETURNING id""",
                ('Cajero Centro', 'operador@charcuteria.com', hash_oper, empresa_id, suc1_id),
            )
            oper1_id = cur.fetchone()[0]
            cur.execute(
                """INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id, sucursal_id)
                   VALUES (%s, %s, %s, 'OPERADOR', %s, %s) RETURNING id""",
                ('Cajero Norte', 'norte@charcuteria.com', hash_oper, empresa_id, suc2_id),
            )
            oper2_id = cur.fetchone()[0]

            # ─── Categorías ──────────────────────────────
            categorias = [
                ('Jamones y Paletas', 'Jamones serranos, ibéricos, paletas curadas'),
                ('Chorizos y Embutidos', 'Chorizos, longanizas, butifarras'),
                ('Salchichones', 'Salchichón, fuet, salami'),
                ('Quesos', 'Quesos nacionales e importados'),
                ('Aceitunas y Encurtidos', 'Aceitunas, alcaparras, pepinillos'),
                ('Patés y Conservas', 'Patés, anchoas, atún, conservas finas'),
                ('Carnes Frías', 'Pavo, lomo, mortadela, pastrami'),
            ]
            cat_ids = {}
            for nombre, desc in categorias:
                cur.execute(
                    "INSERT INTO categorias (nombre, descripcion) VALUES (%s, %s) RETURNING id",
                    (nombre, desc),
                )
                cat_ids[nombre] = cur.fetchone()[0]

            # ─── Proveedores ─────────────────────────────
            proveedores = [
                ('900100200-1', 'Industria Cárnica S.A.', 'ventas@industrialcarnica.com', '6012345678', 'Bogotá'),
                ('900300400-2', 'Quesería Artesanal Ltda.', 'info@queseriaartesanal.com', '6012345679', 'Medellín'),
                ('900500600-3', 'Distribuidora de Encurtidos', 'pedidos@encurtidos.com', '6012345680', 'Bogotá'),
                ('900700800-4', 'Embutidos Selectos SAS', 'ventas@embutidosselectos.com', '6012345681', 'Cali'),
            ]
            prov_ids = {}
            for nit, nombre, correo, tel, ciudad in proveedores:
                cur.execute(
                    "INSERT INTO proveedores (nit, nombre, correo, telefono, ciudad) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (nit, nombre, correo, tel, ciudad),
                )
                prov_ids[nombre] = cur.fetchone()[0]

            # ─── Productos ───────────────────────────────
            productos = [
                # (sku, nombre, categoria, precio, stock, stock_min, proveedor)
                # Jamón
                ('JAM001', 'Jamón Serrano 500g', 'Jamones y Paletas', 28500, 25, 5, 'Industria Cárnica S.A.'),
                ('JAM002', 'Jamón Ibérico 250g', 'Jamones y Paletas', 45000, 10, 3, 'Industria Cárnica S.A.'),
                ('JAM003', 'Paleta Curada 500g', 'Jamones y Paletas', 22000, 18, 4, 'Industria Cárnica S.A.'),
                ('JAM004', 'Jamón de Pavo 500g', 'Jamones y Paletas', 15000, 30, 8, 'Industria Cárnica S.A.'),
                # Chorizo
                ('CHO001', 'Chorizo Español x Kg', 'Chorizos y Embutidos', 18000, 40, 10, 'Embutidos Selectos SAS'),
                ('CHO002', 'Chorizo Argentino x Kg', 'Chorizos y Embutidos', 16500, 35, 8, 'Embutidos Selectos SAS'),
                ('CHO003', 'Longaniza x Kg', 'Chorizos y Embutidos', 14000, 30, 8, 'Embutidos Selectos SAS'),
                ('CHO004', 'Butifarra x Kg', 'Chorizos y Embutidos', 12500, 28, 6, 'Embutidos Selectos SAS'),
                # Salchichón
                ('SAL001', 'Salchichón Ibérico', 'Salchichones', 38000, 12, 3, 'Industria Cárnica S.A.'),
                ('SAL002', 'Salchichón de Bellota', 'Salchichones', 42000, 8, 2, 'Industria Cárnica S.A.'),
                ('SAL003', 'Fuet Extra', 'Salchichones', 25000, 20, 5, 'Embutidos Selectos SAS'),
                ('SAL004', 'Salami Milán', 'Salchichones', 18000, 25, 6, 'Embutidos Selectos SAS'),
                # Quesos
                ('QUE001', 'Queso Manchego x Kg', 'Quesos', 32000, 15, 4, 'Quesería Artesanal Ltda.'),
                ('QUE002', 'Queso Brie (pieza)', 'Quesos', 22000, 12, 3, 'Quesería Artesanal Ltda.'),
                ('QUE003', 'Queso Gouda x Kg', 'Quesos', 18000, 18, 5, 'Quesería Artesanal Ltda.'),
                ('QUE004', 'Queso Azul x Kg', 'Quesos', 28000, 10, 3, 'Quesería Artesanal Ltda.'),
                ('QUE005', 'Queso Parmesano x Kg', 'Quesos', 35000, 8, 2, 'Quesería Artesanal Ltda.'),
                # Aceitunas
                ('ACE001', 'Aceitunas Manzanilla 500g', 'Aceitunas y Encurtidos', 8500, 50, 12, 'Distribuidora de Encurtidos'),
                ('ACE002', 'Aceitunas Rellenas 500g', 'Aceitunas y Encurtidos', 10000, 45, 10, 'Distribuidora de Encurtidos'),
                ('ACE003', 'Aceitunas Kalamata 500g', 'Aceitunas y Encurtidos', 12000, 30, 8, 'Distribuidora de Encurtidos'),
                ('ACE004', 'Alcaparras 200g', 'Aceitunas y Encurtidos', 6500, 40, 10, 'Distribuidora de Encurtidos'),
                ('ACE005', 'Pepinillos en Vinagre 300g', 'Aceitunas y Encurtidos', 7500, 35, 8, 'Distribuidora de Encurtidos'),
                # Patés
                ('PAT001', 'Paté de Campo 200g', 'Patés y Conservas', 9500, 20, 5, 'Industria Cárnica S.A.'),
                ('PAT002', 'Paté de Pimienta 200g', 'Patés y Conservas', 11000, 18, 4, 'Industria Cárnica S.A.'),
                ('PAT003', 'Anchoas en Aceite (lata)', 'Patés y Conservas', 14000, 25, 6, 'Distribuidora de Encurtidos'),
                ('PAT004', 'Atún en Conserva (lata)', 'Patés y Conservas', 7500, 60, 15, 'Distribuidora de Encurtidos'),
                # Carnes Frías
                ('CAR001', 'Pechuga de Pavo 500g', 'Carnes Frías', 13000, 35, 8, 'Industria Cárnica S.A.'),
                ('CAR002', 'Lomo de Cerdo 500g', 'Carnes Frías', 16000, 28, 6, 'Industria Cárnica S.A.'),
                ('CAR003', 'Mortadela 500g', 'Carnes Frías', 8500, 40, 10, 'Industria Cárnica S.A.'),
                ('CAR004', 'Pastrami 500g', 'Carnes Frías', 19000, 15, 4, 'Industria Cárnica S.A.'),
            ]

            prod_ids = {}
            for sku, nombre, cat, precio, stock, stock_min, prov in productos:
                cur.execute(
                    """INSERT INTO productos (sku, nombre, categoria_id, precio, stock_actual, stock_minimo, sucursal_id)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (sku, nombre, cat_ids[cat], precio, stock, stock_min, suc1_id),
                )
                pid = cur.fetchone()[0]
                prod_ids[sku] = pid

                # Vincular con proveedor
                cur.execute(
                    "INSERT INTO producto_proveedor (producto_id, proveedor_id, costo, es_principal) VALUES (%s, %s, %s, true)",
                    (pid, prov_ids[prov], round(precio * 0.65)),
                )

            # Algunos productos también en sucursal Norte (con stock diferente)
            for sku in ['JAM001', 'JAM004', 'CHO001', 'QUE001', 'ACE001', 'PAT004', 'CAR003']:
                nombre_match = next(p[1] for p in productos if p[0] == sku)
                precio_match = next(p[3] for p in productos if p[0] == sku)
                cat_match = next(p[2] for p in productos if p[0] == sku)
                cur.execute(
                    """INSERT INTO productos (sku, nombre, categoria_id, precio, stock_actual, stock_minimo, sucursal_id)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (f'{sku}-N', f'{nombre_match} (Norte)', cat_ids[cat_match], precio_match, random.randint(5, 20), 3, suc2_id),
                )

            # ─── Clientes ───────────────────────────────
            clientes = [
                ('12345678', 'Juan Pérez', 'juan@email.com', '3001112233', 'Bogotá'),
                ('23456789', 'María García', 'maria@email.com', '3001112244', 'Bogotá'),
                ('34567890', 'Carlos López', 'carlos@email.com', '3001112255', 'Bogotá'),
                ('45678901', 'Ana Martínez', 'ana@email.com', '3001112266', 'Medellín'),
                ('900123456', 'Restaurante La Española', 'info@laespanola.com', '3001112277', 'Bogotá'),
                ('56789012', 'Pedro Ramírez', 'pedro@email.com', '3001112288', 'Bogotá'),
            ]
            cli_ids = []
            for doc, nom, corr, tel, ciudad in clientes:
                cur.execute(
                    "INSERT INTO clientes (documento, nombre, correo, telefono, ciudad, sucursal_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (doc, nom, corr, tel, ciudad, suc1_id),
                )
                cli_ids.append(cur.fetchone()[0])

            # ─── Órdenes de venta ───────────────────────
            # (cliente_id, num_items, total_aprox, estado, usuario_id, sucursal_id)
            ordenes_data = [
                # Admin — Centro
                (cli_ids[0], 2, 50000, 'PAGADA', admin_id, suc1_id),
                (cli_ids[1], 1, 32000, 'PAGADA', admin_id, suc1_id),
                (cli_ids[2], 3, 42000, 'PENDIENTE', admin_id, suc1_id),
                # Cajero Centro
                (cli_ids[4], 5, 95000, 'PAGADA', oper1_id, suc1_id),
                (cli_ids[3], 1, 15000, 'PAGADA', oper1_id, suc1_id),
                (cli_ids[0], 2, 28000, 'PAGADA', oper1_id, suc1_id),
                (cli_ids[5], 1, 38000, 'PENDIENTE', oper1_id, suc1_id),
                # Cajero Norte
                (cli_ids[1], 3, 55000, 'PAGADA', oper2_id, suc2_id),
                (cli_ids[4], 2, 42000, 'PAGADA', oper2_id, suc2_id),
                (cli_ids[3], 4, 72000, 'PAGADA', oper2_id, suc2_id),
                (cli_ids[5], 1, 25000, 'PENDIENTE', oper2_id, suc2_id),
            ]
            prod_list = list(prod_ids.values())

            for cliente_id, num_items, total_aprox, estado, usuario_id, suc_id in ordenes_data:
                cur.execute(
                    """INSERT INTO ordenes_venta (cliente_id, usuario_id, estado, total, sucursal_id, dinero_recibido, cambio)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (cliente_id, usuario_id, estado, total_aprox, suc_id,
                     total_aprox + random.choice([0, 1000, 2000, 5000]) if estado == 'PAGADA' else None,
                     0),
                )
                orden_id = cur.fetchone()[0]

                # Items (unique products per order)
                for pid in random.sample(prod_list, min(num_items, len(prod_list))):
                    cur.execute('SELECT precio FROM productos WHERE id=%s', (pid,))
                    precio = cur.fetchone()[0]
                    cant = random.randint(1, 3)
                    cur.execute(
                        "INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES (%s, %s, %s, %s) ON CONFLICT (orden_id, producto_id) DO UPDATE SET cantidad = orden_items.cantidad + EXCLUDED.cantidad",
                        (orden_id, pid, cant, precio),
                    )
                    cur.execute(
                        "CALL sp_actualizar_stock_producto(%s, %s, %s, %s)",
                        (pid, -cant, f'Venta orden #{orden_id}', 'SALIDA'),
                    )

                cur.execute(
                    "UPDATE ordenes_venta SET total=(SELECT coalesce(sum(subtotal),0) FROM orden_items WHERE orden_id=%s) WHERE id=%s",
                    (orden_id, orden_id),
                )
                if estado == 'PAGADA':
                    cur.execute(
                        "UPDATE ordenes_venta SET cambio=dinero_recibido-total WHERE id=%s",
                        (orden_id,),
                    )

            conn.commit()
            print('  [OK] Datos de prueba insertados')

    print()
    print(SEP)
    print('  DATOS DE PRUEBA CARGADOS')
    print(SEP)
    print('  Empresa: Charcuteria El Artesano S.A.S.')
    print('  Codigo:   ARTE2026')
    print()
    print('  ADMIN:    admin@charcuteria.com')
    print('  OPERADORES:')
    print('    Centro -> operador@charcuteria.com')
    print('    Norte  -> norte@charcuteria.com')
    print('  Password: Admin123! (todos)')
    print()
    print('  Sucursales: Centro, Norte')
    print('  Categorias: 7  |  Productos: 31')
    print('  Clientes:   6  |  Proveedores: 4')
    print('  Ordenes:    11 (varios estados, varios usuarios)')
    print(SEP)


if __name__ == '__main__':
    main()
