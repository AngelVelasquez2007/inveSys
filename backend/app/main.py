import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

from .auth import router as auth_router, get_current_user, seed_admin
from .database import get_conn
from .reportes import generar_pdf

app = FastAPI(title='InveSys API', version='2.0.0')

UPLOADS_DIR = Path(__file__).resolve().parent.parent / 'uploads'
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR = UPLOADS_DIR / 'avatars'
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(UPLOADS_DIR)), name='uploads')

app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)

app.include_router(auth_router)


@app.on_event('startup')
def startup():
  seed_admin()


# ─── Helpers ────────────────────────────────────────────────

def fetch_all(query, params=()):
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(query, params)
      return cur.fetchall()


def fetch_one(query, params=()):
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(query, params)
      row = cur.fetchone()
      if row is None:
        raise HTTPException(status_code=404, detail='Registro no encontrado')
      return row


def where_sucursal(_usuario, _alias=''):
  return '', []


# ─── Schemas ────────────────────────────────────────────────

class ProductoIn(BaseModel):
  sku: str = Field(min_length=3, max_length=30)
  nombre: str = Field(min_length=3, max_length=120)
  categoria_id: int = Field(gt=0)
  proveedor_id: int | None = Field(default=None, gt=0)
  precio: Decimal = Field(gt=0)
  stock_actual: int = Field(ge=0)
  stock_minimo: int = Field(ge=0)
  activo: bool = True


class ProductoUpdate(BaseModel):
  nombre: str = Field(min_length=3, max_length=120)
  categoria_id: int = Field(gt=0)
  proveedor_id: int | None = Field(default=None, gt=0)
  precio: Decimal = Field(gt=0)
  stock_actual: int = Field(ge=0)
  stock_minimo: int = Field(ge=0)
  activo: bool = True


class ClienteIn(BaseModel):
  documento: str = Field(min_length=5, max_length=30)
  nombre: str = Field(min_length=3, max_length=120)
  correo: EmailStr
  telefono: str | None = Field(default=None, max_length=30)
  ciudad: str = Field(min_length=2, max_length=80)
  activo: bool = True


class ClienteUpdate(BaseModel):
  nombre: str = Field(min_length=3, max_length=120)
  correo: EmailStr
  telefono: str | None = Field(default=None, max_length=30)
  ciudad: str = Field(min_length=2, max_length=80)
  activo: bool = True


class MovimientoIn(BaseModel):
  producto_id: int = Field(gt=0)
  tipo: Literal['ENTRADA', 'SALIDA']
  cantidad: int = Field(gt=0)
  motivo: str = Field(min_length=3, max_length=160)


class CategoriaIn(BaseModel):
  nombre: str = Field(min_length=2, max_length=80)
  descripcion: str | None = Field(default=None, max_length=255)


class CategoriaUpdate(BaseModel):
  nombre: str = Field(min_length=2, max_length=80)
  descripcion: str | None = Field(default=None, max_length=255)


class ProveedorIn(BaseModel):
  nit: str = Field(min_length=3, max_length=30)
  nombre: str = Field(min_length=3, max_length=120)
  correo: str = Field(max_length=160)
  telefono: str | None = Field(default=None, max_length=30)
  ciudad: str = Field(min_length=2, max_length=80)
  activo: bool = True


class ProveedorUpdate(BaseModel):
  nombre: str = Field(min_length=3, max_length=120)
  correo: str = Field(max_length=160)
  telefono: str | None = Field(default=None, max_length=30)
  ciudad: str = Field(min_length=2, max_length=80)
  activo: bool = True


class OrdenItemIn(BaseModel):
  producto_id: int = Field(gt=0)
  cantidad: int = Field(gt=0)


class OrdenVentaIn(BaseModel):
  cliente_id: int | None = None
  items: list[OrdenItemIn] = Field(min_length=1)
  dinero_recibido: float | None = None
  descuento_id: int | None = None
  descuento_aplicado: float | None = None


class OrdenEstadoUpdate(BaseModel):
  estado: Literal['PENDIENTE', 'PAGADA', 'ANULADA', 'DESPACHADA']


class ReporteFechas(BaseModel):
  fecha_inicio: str | None = None
  fecha_fin: str | None = None


class SucursalIn(BaseModel):
  nombre: str = Field(min_length=2, max_length=255)


# ─── Health ─────────────────────────────────────────────────

@app.get('/health')
def health():
  return {'status': 'ok'}


# ─── Sucursales ─────────────────────────────────────────────

@app.get('/sucursales')
def listar_sucursales(usuario: dict = Depends(get_current_user)):
  eid = usuario.get('empresa_id')
  if not eid:
    return fetch_all('SELECT id, nombre, created_at FROM sucursales ORDER BY nombre')
  return fetch_all(
    'SELECT id, nombre, created_at FROM sucursales WHERE empresa_id=%s ORDER BY nombre',
    (eid,),
  )


@app.post('/sucursales', status_code=201)
def crear_sucursal(payload: SucursalIn, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden crear sucursales')
  eid = usuario.get('empresa_id')
  if not eid:
    raise HTTPException(status_code=400, detail='No tienes una empresa asociada')
  return fetch_one(
    'INSERT INTO sucursales (nombre, empresa_id) VALUES (%s, %s) RETURNING *',
    (payload.nombre.strip(), eid),
  )


@app.put('/sucursales/{sucursal_id}')
def actualizar_sucursal(sucursal_id: int, payload: SucursalIn, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden modificar sucursales')
  return fetch_one(
    'UPDATE sucursales SET nombre=%s WHERE id=%s RETURNING *',
    (payload.nombre.strip(), sucursal_id),
  )


@app.delete('/sucursales/{sucursal_id}')
def eliminar_sucursal(sucursal_id: int, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden eliminar sucursales')
  return fetch_one('DELETE FROM sucursales WHERE id=%s RETURNING *', (sucursal_id,))


@app.get('/sucursales/{sucursal_id}/detalle')
def detalle_sucursal(sucursal_id: int, usuario: dict = Depends(get_current_user)):
  sucursal = fetch_one(
    'SELECT id, nombre, created_at FROM sucursales WHERE id=%s',
    (sucursal_id,),
  )
  productos = fetch_all('''
    SELECT id, sku, nombre, precio, stock_actual, stock_minimo
    FROM productos WHERE sucursal_id=%s AND activo ORDER BY nombre
  ''', (sucursal_id,))
  clientes = fetch_all('''
    SELECT id, documento, nombre, correo, telefono, ciudad
    FROM clientes WHERE sucursal_id=%s AND activo ORDER BY nombre
  ''', (sucursal_id,))
  ordenes = fetch_all('''
    SELECT o.id, o.total, o.estado, o.fecha,
           coalesce(c.nombre, 'Mostrador') as cliente,
           u.nombre as usuario
    FROM ordenes_venta o
    LEFT JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN usuarios u ON u.id = o.usuario_id
    WHERE o.sucursal_id=%s
    ORDER BY o.fecha DESC, o.id DESC
    LIMIT 20
  ''', (sucursal_id,))
  resumen = fetch_one(f'''
    SELECT
      (SELECT count(*) FROM productos WHERE sucursal_id=%s AND activo) as total_productos,
      (SELECT coalesce(sum(stock_actual), 0) FROM productos WHERE sucursal_id=%s AND activo) as stock_total,
      (SELECT count(*) FROM clientes WHERE sucursal_id=%s AND activo) as total_clientes,
      (SELECT count(*) FROM ordenes_venta WHERE sucursal_id=%s) as total_ordenes,
      (SELECT coalesce(sum(total), 0) FROM ordenes_venta WHERE sucursal_id=%s AND estado='PAGADA') as ingresos
  ''', (sucursal_id,) * 5)
  return {
    'sucursal': sucursal,
    'resumen': resumen,
    'productos': productos,
    'clientes': clientes,
    'ordenes': ordenes,
  }


# ─── Categorías ─────────────────────────────────────────────

@app.get('/categorias')
def listar_categorias(_usuario: dict = Depends(get_current_user)):
  return fetch_all('select id, nombre, descripcion from categorias order by nombre')


@app.post('/categorias', status_code=201)
def crear_categoria(payload: CategoriaIn, _usuario: dict = Depends(get_current_user)):
  try:
    return fetch_one(
      'insert into categorias(nombre, descripcion) values (%s, %s) returning *',
      (payload.nombre.strip(), payload.descripcion.strip() if payload.descripcion else None),
    )
  except Exception as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put('/categorias/{categoria_id}')
def actualizar_categoria(categoria_id: int, payload: CategoriaUpdate, _usuario: dict = Depends(get_current_user)):
  return fetch_one(
    'update categorias set nombre=%s, descripcion=%s where id=%s returning *',
    (payload.nombre.strip(), payload.descripcion.strip() if payload.descripcion else None, categoria_id),
  )


@app.delete('/categorias/{categoria_id}')
def eliminar_categoria(categoria_id: int, _usuario: dict = Depends(get_current_user)):
  try:
    return fetch_one('delete from categorias where id=%s returning *', (categoria_id,))
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=400, detail='No se puede eliminar: la categoría tiene productos asociados') from exc


# ─── Proveedores ────────────────────────────────────────────

@app.get('/proveedores')
def listar_proveedores(_usuario: dict = Depends(get_current_user)):
  return fetch_all('select id, nit, nombre, correo, telefono, ciudad, activo from proveedores order by nombre')


@app.post('/proveedores', status_code=201)
def crear_proveedor(payload: ProveedorIn, _usuario: dict = Depends(get_current_user)):
  try:
    return fetch_one(
      'insert into proveedores(nit, nombre, correo, telefono, ciudad, activo) values (%s, %s, %s, %s, %s, %s) returning *',
      (payload.nit.strip().upper(), payload.nombre.strip(), payload.correo.strip().lower(), payload.telefono.strip() if payload.telefono else None, payload.ciudad.strip(), payload.activo),
    )
  except Exception as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put('/proveedores/{proveedor_id}')
def actualizar_proveedor(proveedor_id: int, payload: ProveedorUpdate, _usuario: dict = Depends(get_current_user)):
  return fetch_one(
    'update proveedores set nombre=%s, correo=%s, telefono=%s, ciudad=%s, activo=%s, updated_at=now() where id=%s returning *',
    (payload.nombre.strip(), payload.correo.strip().lower(), payload.telefono.strip() if payload.telefono else None, payload.ciudad.strip(), payload.activo, proveedor_id),
  )


@app.delete('/proveedores/{proveedor_id}')
def eliminar_proveedor(proveedor_id: int, _usuario: dict = Depends(get_current_user)):
  return fetch_one('update proveedores set activo=false, updated_at=now() where id=%s returning *', (proveedor_id,))


# ─── Catálogos ──────────────────────────────────────────────

@app.get('/catalogos')
def catalogos(_usuario: dict = Depends(get_current_user)):
  categorias = fetch_all('select id, nombre from categorias order by nombre')
  proveedores = fetch_all('select id, nombre from proveedores order by nombre')
  return {'categorias': categorias, 'proveedores': proveedores}


# ─── Dashboard ──────────────────────────────────────────────

@app.get('/dashboard')
def dashboard(usuario: dict = Depends(get_current_user)):
  extra, params = where_sucursal(usuario)
  extra_o, params_o = where_sucursal(usuario, 'o')

  query = f'''
    select
      (select count(*) from productos where activo{extra}) as productos,
      (select coalesce(sum(stock_actual), 0) from productos where activo{extra}) as stock_total,
      (select count(*) from clientes where activo{extra}) as clientes,
      (select count(*) from productos where activo and stock_actual <= stock_minimo{extra}) as alertas
  '''
  resumen = fetch_one(query, params * 4 if params else [])

  bajo_stock = fetch_all(f'''
    select p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo, c.nombre as categoria
    from productos p
    join categorias c on c.id = p.categoria_id
    where p.activo and p.stock_actual <= p.stock_minimo{extra}
    order by p.stock_actual asc, p.nombre
    limit 10
  ''', params)

  ultimas_ventas = fetch_all(f'''
    select o.id, o.total, o.estado, o.fecha,
           coalesce(c.nombre, 'Mostrador') as cliente,
           s.nombre as sucursal,
           o.descuento_id, o.descuento_aplicado
    from ordenes_venta o
    left join clientes c on c.id = o.cliente_id
    left join sucursales s on s.id = o.sucursal_id
    where 1=1{extra_o}
    order by o.fecha desc, o.id desc
    limit 5
  ''', params_o)

  return {'resumen': resumen, 'bajo_stock': bajo_stock, 'ultimas_ventas': ultimas_ventas}


# ─── Productos ──────────────────────────────────────────────

@app.get('/productos')
def listar_productos(usuario: dict = Depends(get_current_user)):
  extra, params = where_sucursal(usuario, 'p')
  return fetch_all(f'''
    select p.id, p.sku, p.nombre, p.precio, p.stock_actual, p.stock_minimo, p.activo,
           c.id as categoria_id, c.nombre as categoria,
           pr.id as proveedor_id, pr.nombre as proveedor
    from productos p
    join categorias c on c.id = p.categoria_id
    left join producto_proveedor pp on pp.producto_id = p.id and pp.es_principal
    left join proveedores pr on pr.id = pp.proveedor_id
    where 1=1{extra}
    order by p.id
  ''', params)


@app.post('/productos', status_code=201)
def crear_producto(payload: ProductoIn, usuario: dict = Depends(get_current_user)):
  sid = usuario.get('sucursal_id')
  try:
    with get_conn() as conn:
      with conn.cursor() as cur:
        cur.execute(
          'call sp_insertar_producto(%s,%s,%s,%s,%s,%s,%s,%s)',
          (
            payload.sku,
            payload.nombre,
            payload.categoria_id,
            payload.proveedor_id,
            payload.precio,
            payload.stock_actual,
            payload.stock_minimo,
            payload.activo,
          ),
        )
        if sid:
          cur.execute('UPDATE productos SET sucursal_id=%s WHERE sku=%s', (sid, payload.sku.upper()))
        cur.execute('select * from productos where sku=%s', (payload.sku.upper(),))
        return cur.fetchone()
  except Exception as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put('/productos/{producto_id}')
def actualizar_producto(producto_id: int, payload: ProductoUpdate, _usuario: dict = Depends(get_current_user)):
  query = '''
    update productos
    set nombre=%s, categoria_id=%s, precio=%s, stock_actual=%s, stock_minimo=%s, activo=%s,
        updated_at=now()
    where id=%s
    returning *
  '''
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(
        query,
        (
          payload.nombre,
          payload.categoria_id,
          payload.precio,
          payload.stock_actual,
          payload.stock_minimo,
          payload.activo,
          producto_id,
        ),
      )
      row = cur.fetchone()
      if row is None:
        raise HTTPException(status_code=404, detail='Registro no encontrado')

      if payload.proveedor_id:
        cur.execute('update producto_proveedor set es_principal=false where producto_id=%s', (producto_id,))
        cur.execute(
          '''
          insert into producto_proveedor(producto_id, proveedor_id, costo, es_principal)
          values (%s, %s, %s, true)
          on conflict (producto_id, proveedor_id)
          do update set es_principal=true, costo=excluded.costo
          ''',
          (producto_id, payload.proveedor_id, payload.precio),
        )
  return row


@app.delete('/productos/{producto_id}')
def eliminar_producto(producto_id: int, _usuario: dict = Depends(get_current_user)):
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute('call sp_eliminar_producto_logico(%s)', (producto_id,))
      cur.execute('select * from productos where id=%s', (producto_id,))
      row = cur.fetchone()
      if row is None:
        raise HTTPException(status_code=404, detail='Registro no encontrado')
      return row


# ─── Clientes ───────────────────────────────────────────────

@app.get('/clientes')
def listar_clientes(usuario: dict = Depends(get_current_user)):
  extra, params = where_sucursal(usuario)
  return fetch_all(f'select * from clientes where 1=1{extra} order by id', params)


@app.post('/clientes', status_code=201)
def crear_cliente(payload: ClienteIn, usuario: dict = Depends(get_current_user)):
  sid = usuario.get('sucursal_id')
  query = '''
    insert into clientes(documento, nombre, correo, telefono, ciudad, activo, sucursal_id)
    values (%s, %s, %s, %s, %s, %s, %s)
    returning *
  '''
  try:
    vals = list(payload.model_dump().values()) + [sid]
    return fetch_one(query, tuple(vals))
  except Exception as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put('/clientes/{cliente_id}')
def actualizar_cliente(cliente_id: int, payload: ClienteUpdate, _usuario: dict = Depends(get_current_user)):
  query = '''
    update clientes
    set nombre=%s, correo=%s, telefono=%s, ciudad=%s, activo=%s, updated_at=now()
    where id=%s
    returning *
  '''
  return fetch_one(query, (*payload.model_dump().values(), cliente_id))


@app.delete('/clientes/{cliente_id}')
def eliminar_cliente(cliente_id: int, _usuario: dict = Depends(get_current_user)):
  return fetch_one('update clientes set activo=false, updated_at=now() where id=%s returning *', (cliente_id,))


# ─── Movimientos ────────────────────────────────────────────

@app.get('/movimientos')
def listar_movimientos(usuario: dict = Depends(get_current_user)):
  extra, params = where_sucursal(usuario, 'p')
  return fetch_all(f'''
    select m.id, m.tipo, m.cantidad, m.motivo, m.created_at,
           p.id as producto_id, p.sku, p.nombre as producto
    from movimientos_inventario m
    join productos p on p.id = m.producto_id
    where 1=1{extra}
    order by m.created_at desc, m.id desc
  ''', params)


@app.post('/movimientos', status_code=201)
def crear_movimiento(payload: MovimientoIn, usuario: dict = Depends(get_current_user)):
  sid = usuario.get('sucursal_id')
  delta = payload.cantidad if payload.tipo == 'ENTRADA' else -payload.cantidad
  with get_conn() as conn:
    try:
      with conn.cursor() as cur:
        cur.execute('call sp_actualizar_stock_producto(%s::bigint, %s::integer, %s, %s)', (payload.producto_id, delta, payload.motivo, payload.tipo))
        if sid:
          cur.execute('UPDATE movimientos_inventario SET sucursal_id=%s WHERE producto_id=%s ORDER BY id DESC LIMIT 1', (sid, payload.producto_id))
        cur.execute(
          '''
          select m.id, m.tipo, m.cantidad, m.motivo, m.created_at,
                 p.id as producto_id, p.sku, p.nombre as producto
          from movimientos_inventario m
          join productos p on p.id = m.producto_id
          where m.producto_id=%s
          order by m.id desc
          limit 1
          ''',
          (payload.producto_id,),
        )
        return cur.fetchone()
    except Exception as exc:
      raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete('/movimientos/{movimiento_id}')
def eliminar_movimiento(movimiento_id: int, _usuario: dict = Depends(get_current_user)):
  return fetch_one('delete from movimientos_inventario where id=%s returning *', (movimiento_id,))


# ─── Órdenes ────────────────────────────────────────────────

@app.get('/ordenes')
def listar_ordenes(usuario: dict = Depends(get_current_user)):
  extra, params = where_sucursal(usuario, 'o')
  return fetch_all(f'''
    select o.id, o.estado, o.total, o.dinero_recibido, o.cambio, o.fecha,
           o.descuento_id, o.descuento_aplicado,
           c.id as cliente_id, coalesce(c.nombre, 'Mostrador') as cliente,
           u.nombre as usuario, s.nombre as sucursal
    from ordenes_venta o
    left join clientes c on c.id = o.cliente_id
    left join usuarios u on u.id = o.usuario_id
    left join sucursales s on s.id = o.sucursal_id
    where 1=1{extra}
    order by o.fecha desc, o.id desc
    limit 100
  ''', params)


@app.get('/ordenes/{orden_id}')
def obtener_orden(orden_id: int, _usuario: dict = Depends(get_current_user)):
  orden = fetch_one('''
    select o.*, coalesce(c.nombre, 'Mostrador') as cliente, u.nombre as usuario
    from ordenes_venta o
    left join clientes c on c.id = o.cliente_id
    left join usuarios u on u.id = o.usuario_id
    where o.id=%s
  ''', (orden_id,))
  items = fetch_all('''
    select oi.*, p.sku, p.nombre as producto
    from orden_items oi
    join productos p on p.id = oi.producto_id
    where oi.orden_id=%s
    order by oi.id
  ''', (orden_id,))
  return {**orden, 'items': items}


@app.post('/ordenes', status_code=201)
def crear_orden(payload: OrdenVentaIn, usuario: dict = Depends(get_current_user)):
  sid = usuario.get('sucursal_id')
  dinero = payload.dinero_recibido
  estado_final = 'PAGADA' if dinero else 'PENDIENTE'
  with get_conn() as conn:
    with conn.cursor() as cur:
      try:
        if sid:
          cur.execute(
            "insert into ordenes_venta(cliente_id, usuario_id, estado, sucursal_id, descuento_id, descuento_aplicado) values (%s, %s, %s, %s, %s, %s) returning id",
            (payload.cliente_id if payload.cliente_id else None, usuario['id'], estado_final, sid, payload.descuento_id, payload.descuento_aplicado),
          )
        else:
          cur.execute(
            "insert into ordenes_venta(cliente_id, usuario_id, estado, descuento_id, descuento_aplicado) values (%s, %s, %s, %s, %s) returning id",
            (payload.cliente_id if payload.cliente_id else None, usuario['id'], estado_final, payload.descuento_id, payload.descuento_aplicado),
          )
        orden_id = cur.fetchone()['id']

        for item in payload.items:
          cur.execute('select precio from productos where id=%s and activo', (item.producto_id,))
          prod = cur.fetchone()
          if prod is None:
            raise HTTPException(status_code=400, detail=f'Producto {item.producto_id} no encontrado o inactivo')

          cur.execute(
            'insert into orden_items(orden_id, producto_id, cantidad, precio_unitario) values (%s, %s, %s, %s)',
            (orden_id, item.producto_id, item.cantidad, prod['precio']),
          )

          cur.execute(
            'call sp_actualizar_stock_producto(%s::bigint, %s::integer, %s, %s)',
            (item.producto_id, -item.cantidad, f'Venta orden #{orden_id}', 'SALIDA'),
          )

        cur.execute("""
          update ordenes_venta
          set total = (select coalesce(sum(subtotal),0) from orden_items where orden_id=%s),
              dinero_recibido = %s,
              cambio = case when %s then %s - (select coalesce(sum(subtotal),0) from orden_items where orden_id=%s) else 0 end
          where id=%s
          returning *
        """, (orden_id, dinero, dinero is not None, dinero, orden_id, orden_id))
        conn.commit()
        return {**cur.fetchone(), 'items': payload.items}
      except HTTPException:
        raise
      except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put('/ordenes/{orden_id}/estado')
def actualizar_estado_orden(orden_id: int, payload: OrdenEstadoUpdate, _usuario: dict = Depends(get_current_user)):
  return fetch_one(
    'update ordenes_venta set estado=%s where id=%s returning *',
    (payload.estado, orden_id),
  )


# ─── Reportes ───────────────────────────────────────────────

@app.get('/reportes/ventas')
def reporte_ventas(
  fecha_inicio: str | None = None,
  fecha_fin: str | None = None,
  usuario: dict = Depends(get_current_user),
):
  if not fecha_inicio:
    fecha_inicio = '1970-01-01'
  if not fecha_fin:
    fecha_fin = '2999-12-31'

  fi, ff = fecha_inicio, fecha_fin

  resumen = fetch_one('''
    select
      (select coalesce(count(*), 0) from ordenes_venta where estado!='ANULADA' and fecha::date>=%s::date and fecha::date<=%s::date) as total_ventas,
      (select coalesce(sum(total), 0) from ordenes_venta where estado!='ANULADA' and fecha::date>=%s::date and fecha::date<=%s::date) as total_ingresos,
      (select coalesce(sum(case when tipo='ENTRADA' then cantidad else 0 end), 0) from movimientos_inventario m join productos p on p.id=m.producto_id where p.activo and m.created_at::date>=%s::date and m.created_at::date<=%s::date) as total_entradas,
      (select coalesce(sum(case when tipo='SALIDA' then cantidad else 0 end), 0) from movimientos_inventario m join productos p on p.id=m.producto_id where p.activo and m.created_at::date>=%s::date and m.created_at::date<=%s::date) as total_salidas
  ''', (fi, ff, fi, ff, fi, ff, fi, ff))

  detalle = fetch_all('''
    select p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo,
           coalesce((select sum(cantidad) from orden_items oi join ordenes_venta ov on ov.id=oi.orden_id where ov.estado!='ANULADA' and oi.producto_id=p.id and ov.fecha::date>=%s::date and ov.fecha::date<=%s::date), 0) as unidades_vendidas,
           coalesce((select count(*) from orden_items oi join ordenes_venta ov on ov.id=oi.orden_id where ov.estado!='ANULADA' and oi.producto_id=p.id and ov.fecha::date>=%s::date and ov.fecha::date<=%s::date), 0) as veces_vendido,
           coalesce(sum(case when m.tipo='ENTRADA' then m.cantidad else 0 end), 0) as entradas,
           coalesce(sum(case when m.tipo='SALIDA' then m.cantidad else 0 end), 0) as salidas
    from productos p
    left join movimientos_inventario m on m.producto_id=p.id and m.created_at::date>=%s::date and m.created_at::date<=%s::date
    where p.activo
    group by p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo
    order by p.nombre
  ''', (fi, ff, fi, ff, fi, ff))

  return {'resumen': resumen, 'detalle': detalle}


@app.get('/reportes/ventas/pdf')
def reporte_ventas_pdf(
  fecha_inicio: str | None = None,
  fecha_fin: str | None = None,
  usuario: dict = Depends(get_current_user),
):
  from fastapi.responses import Response

  if not fecha_inicio:
    fecha_inicio = '1970-01-01'
  if not fecha_fin:
    fecha_fin = '2999-12-31'

  pdf_bytes = generar_pdf(fecha_inicio, fecha_fin, usuario.get('correo', 'Sistema'))
  return Response(
    content=pdf_bytes,
    media_type='application/pdf',
    headers={'Content-Disposition': f'attachment; filename="reporte_invesys_{fecha_inicio}_{fecha_fin}.pdf"'},
  )


# ─── Auditoría ──────────────────────────────────────────────

@app.get('/auditoria')
def listar_auditoria(usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden ver la auditoría')
  return fetch_all('''
    select id, usuario, accion, tabla_afectada, registro_id, valores_anteriores,
           valores_nuevos, ip_conexion, created_at
    from auditoria
    order by created_at desc, id desc
    limit 100
  ''')


# ─── Usuarios (admin) ───────────────────────────────────────

@app.get('/usuarios')
def listar_usuarios(usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden ver usuarios')
  eid = usuario.get('empresa_id')
  if not eid:
    return fetch_all('SELECT id, nombre, correo, rol, activo, created_at FROM usuarios ORDER BY id')
  return fetch_all(
    '''SELECT u.id, u.nombre, u.correo, u.rol, u.activo, u.sucursal_id, u.created_at,
              s.nombre as sucursal_nombre
       FROM usuarios u
       LEFT JOIN sucursales s ON s.id = u.sucursal_id
       WHERE u.empresa_id=%s
       ORDER BY u.id''',
    (eid,),
  )


@app.get('/usuarios/{usuario_id}/cambiar-sucursal')
def cambiar_sucursal_por_admin(usuario_id: int, sucursal_id: int, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores')
  return fetch_one(
    'UPDATE usuarios SET sucursal_id=%s WHERE id=%s RETURNING id, nombre, sucursal_id',
    (sucursal_id, usuario_id),
  )


# ─── Avatar ──────────────────────────────────────────────────

@app.post('/auth/me/avatar', status_code=200)
def subir_avatar(file: UploadFile, usuario: dict = Depends(get_current_user)):
  ext = Path(file.filename).suffix if file.filename else '.jpg'
  filename = f'avatar_{usuario["id"]}_{int(datetime.utcnow().timestamp())}{ext}'
  path = AVATARS_DIR / filename
  content = file.file.read()
  with open(path, 'wb') as f:
    f.write(content)
  avatar_url = f'/uploads/avatars/{filename}'
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute('UPDATE usuarios SET avatar_url=%s WHERE id=%s', (avatar_url, usuario['id']))
      conn.commit()
  return {'avatar_url': avatar_url}


# ─── Mensajes ────────────────────────────────────────────────

class MensajeIn(BaseModel):
  contenido: str = Field(..., min_length=1, max_length=2000)
  sucursal_ids: list[int]


@app.get('/mensajes')
def listar_mensajes(usuario: dict = Depends(get_current_user)):
  with get_conn() as conn:
    with conn.cursor() as cur:
      if usuario['rol'] == 'ADMIN':
        cur.execute('''
          SELECT m.id, m.contenido, m.created_at,
                 u.nombre as remitente,
                 COALESCE(array_agg(ms.sucursal_id) FILTER (WHERE ms.sucursal_id IS NOT NULL), '{}') as sucursales_ids
          FROM mensajes m
          JOIN usuarios u ON u.id = m.remitente_id
          LEFT JOIN mensaje_sucursal ms ON ms.mensaje_id = m.id
          GROUP BY m.id, u.nombre
          ORDER BY m.created_at DESC
          LIMIT 50
        ''')
      else:
        sid = usuario.get('sucursal_id')
        if sid is None:
          return []
        cur.execute('''
          SELECT m.id, m.contenido, m.created_at, u.nombre as remitente
          FROM mensajes m
          JOIN mensaje_sucursal ms ON ms.mensaje_id = m.id
          JOIN usuarios u ON u.id = m.remitente_id
          WHERE ms.sucursal_id = %s
          ORDER BY m.created_at DESC
          LIMIT 50
        ''', (sid,))
      return cur.fetchall()


@app.post('/mensajes', status_code=201)
def crear_mensaje(payload: MensajeIn, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores pueden enviar mensajes')
  if not payload.sucursal_ids:
    raise HTTPException(status_code=400, detail='Selecciona al menos una sucursal')
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(
        'INSERT INTO mensajes (remitente_id, contenido) VALUES (%s, %s) RETURNING id',
        (usuario['id'], payload.contenido.strip()),
      )
      mid = cur.fetchone()['id']
      for sid in payload.sucursal_ids:
        cur.execute(
          'INSERT INTO mensaje_sucursal (mensaje_id, sucursal_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
          (mid, sid),
        )
      conn.commit()
      return {'mensaje': 'Mensaje enviado', 'id': mid}


# ─── Descuentos / Ofertas ────────────────────────────────────

class DescuentoIn(BaseModel):
  titulo: str = Field(..., min_length=1, max_length=200)
  descripcion: str | None = None
  tipo: Literal['PORCENTAJE', 'FIJO']
  valor: Decimal
  fecha_inicio: str | None = None  # ISO date
  fecha_fin: str | None = None
  sucursal_ids: list[int]


@app.get('/descuentos')
def listar_descuentos(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    SELECT d.*, COALESCE(array_agg(ds.sucursal_id) FILTER (WHERE ds.sucursal_id IS NOT NULL), '{}') as sucursales_ids
    FROM descuentos d
    LEFT JOIN descuento_sucursal ds ON ds.descuento_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
    LIMIT 50
  ''')


@app.get('/descuentos/activos')
def descuentos_activos(usuario: dict = Depends(get_current_user)):
  sid = usuario.get('sucursal_id')
  with get_conn() as conn:
    with conn.cursor() as cur:
      if sid:
        cur.execute('''
          SELECT d.* FROM descuentos d
          JOIN descuento_sucursal ds ON ds.descuento_id = d.id
          WHERE d.activo AND ds.sucursal_id = %s
            AND (d.fecha_fin IS NULL OR d.fecha_fin > now())
            AND d.fecha_inicio <= now()
          ORDER BY d.created_at DESC
        ''', (sid,))
      else:
        cur.execute('''
          SELECT d.* FROM descuentos d
          WHERE d.activo
            AND (d.fecha_fin IS NULL OR d.fecha_fin > now())
            AND d.fecha_inicio <= now()
          ORDER BY d.created_at DESC
        ''')
      return cur.fetchall()


@app.post('/descuentos', status_code=201)
def crear_descuento(payload: DescuentoIn, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores')
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(
        '''INSERT INTO descuentos (titulo, descripcion, tipo, valor, fecha_inicio, fecha_fin)
           VALUES (%s, %s, %s, %s,
                   COALESCE(%s::timestamptz, now()),
                   %s::timestamptz)
           RETURNING id''',
        (payload.titulo.strip(), payload.descripcion.strip() if payload.descripcion else None,
         payload.tipo, payload.valor,
         payload.fecha_inicio or None, payload.fecha_fin or None),
      )
      did = cur.fetchone()['id']
      for ss in payload.sucursal_ids:
        cur.execute('INSERT INTO descuento_sucursal (descuento_id, sucursal_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (did, ss))
      conn.commit()
      return {'mensaje': 'Descuento creado', 'id': did}


@app.put('/descuentos/{descuento_id}')
def actualizar_descuento(descuento_id: int, payload: DescuentoIn, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores')
  with get_conn() as conn:
    with conn.cursor() as cur:
      cur.execute(
        '''UPDATE descuentos SET titulo=%s, descripcion=%s, tipo=%s, valor=%s,
             fecha_inicio=COALESCE(%s::timestamptz, now()), fecha_fin=%s::timestamptz
           WHERE id=%s''',
        (payload.titulo.strip(), payload.descripcion.strip() if payload.descripcion else None,
         payload.tipo, payload.valor,
         payload.fecha_inicio or None, payload.fecha_fin or None,
         descuento_id),
      )
      cur.execute('DELETE FROM descuento_sucursal WHERE descuento_id=%s', (descuento_id,))
      for ss in payload.sucursal_ids:
        cur.execute('INSERT INTO descuento_sucursal (descuento_id, sucursal_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (descuento_id, ss))
      conn.commit()
      return {'mensaje': 'Descuento actualizado'}


@app.delete('/descuentos/{descuento_id}')
def eliminar_descuento(descuento_id: int, usuario: dict = Depends(get_current_user)):
  if usuario['rol'] != 'ADMIN':
    raise HTTPException(status_code=403, detail='Solo administradores')
  return fetch_one('DELETE FROM descuentos WHERE id=%s RETURNING id', (descuento_id,))
