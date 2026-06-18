from decimal import Decimal
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .auth import router as auth_router, get_current_user, seed_admin
from .database import get_conn
from .reportes import generar_pdf

app = FastAPI(title='InveSys API', version='1.0.0')

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


class OrdenEstadoUpdate(BaseModel):
  estado: Literal['PENDIENTE', 'PAGADA', 'ANULADA', 'DESPACHADA']


class ReporteFechas(BaseModel):
  fecha_inicio: str | None = None
  fecha_fin: str | None = None


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


@app.get('/health')
def health():
  return {'status': 'ok'}


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


@app.get('/catalogos')
def catalogos(_usuario: dict = Depends(get_current_user)):
  categorias = fetch_all('select id, nombre from categorias order by nombre')
  proveedores = fetch_all('select id, nombre from proveedores order by nombre')
  return {'categorias': categorias, 'proveedores': proveedores}


@app.get('/dashboard')
def dashboard(_usuario: dict = Depends(get_current_user)):
  query = '''
    select
      (select count(*) from productos where activo) as productos,
      (select coalesce(sum(stock_actual), 0) from productos where activo) as stock_total,
      (select count(*) from clientes where activo) as clientes,
      (select count(*) from productos where activo and stock_actual <= stock_minimo) as alertas
  '''
  resumen = fetch_one(query)
  bajo_stock = fetch_all('''
    select p.id, p.sku, p.nombre, p.stock_actual, p.stock_minimo, c.nombre as categoria
    from productos p
    join categorias c on c.id = p.categoria_id
    where p.activo and p.stock_actual <= p.stock_minimo
    order by p.stock_actual asc, p.nombre
    limit 10
  ''')
  ultimas_ventas = fetch_all('''
    select o.id, o.total, o.estado, o.fecha, coalesce(c.nombre, 'Mostrador') as cliente
    from ordenes_venta o
    left join clientes c on c.id = o.cliente_id
    order by o.fecha desc, o.id desc
    limit 5
  ''')
  return {'resumen': resumen, 'bajo_stock': bajo_stock, 'ultimas_ventas': ultimas_ventas}


@app.get('/productos')
def listar_productos(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    select p.id, p.sku, p.nombre, p.precio, p.stock_actual, p.stock_minimo, p.activo,
           c.id as categoria_id, c.nombre as categoria,
           pr.id as proveedor_id, pr.nombre as proveedor
    from productos p
    join categorias c on c.id = p.categoria_id
    left join producto_proveedor pp on pp.producto_id = p.id and pp.es_principal
    left join proveedores pr on pr.id = pp.proveedor_id
    order by p.id
  ''')


@app.post('/productos', status_code=201)
def crear_producto(payload: ProductoIn, _usuario: dict = Depends(get_current_user)):
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


@app.get('/clientes')
def listar_clientes(_usuario: dict = Depends(get_current_user)):
  return fetch_all('select * from clientes order by id')


@app.post('/clientes', status_code=201)
def crear_cliente(payload: ClienteIn, _usuario: dict = Depends(get_current_user)):
  query = '''
    insert into clientes(documento, nombre, correo, telefono, ciudad, activo)
    values (%s, %s, %s, %s, %s, %s)
    returning *
  '''
  try:
    return fetch_one(query, tuple(payload.model_dump().values()))
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


@app.get('/movimientos')
def listar_movimientos(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    select m.id, m.tipo, m.cantidad, m.motivo, m.created_at,
           p.id as producto_id, p.sku, p.nombre as producto
    from movimientos_inventario m
    join productos p on p.id = m.producto_id
    order by m.created_at desc, m.id desc
  ''')


@app.post('/movimientos', status_code=201)
def crear_movimiento(payload: MovimientoIn, _usuario: dict = Depends(get_current_user)):
  delta = payload.cantidad if payload.tipo == 'ENTRADA' else -payload.cantidad
  with get_conn() as conn:
    try:
      with conn.cursor() as cur:
        cur.execute('call sp_actualizar_stock_producto(%s::bigint, %s::integer, %s, %s)', (payload.producto_id, delta, payload.motivo, payload.tipo))
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


@app.get('/ordenes')
def listar_ordenes(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    select o.id, o.estado, o.total, o.fecha,
           c.id as cliente_id, coalesce(c.nombre, 'Mostrador') as cliente,
           u.nombre as usuario
    from ordenes_venta o
    left join clientes c on c.id = o.cliente_id
    left join usuarios u on u.id = o.usuario_id
    order by o.fecha desc, o.id desc
    limit 100
  ''')


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
  with get_conn() as conn:
    with conn.cursor() as cur:
      try:
        cur.execute(
          "insert into ordenes_venta(cliente_id, usuario_id, estado) values (%s, %s, 'PENDIENTE') returning id",
          (payload.cliente_id if payload.cliente_id else None, usuario['id']),
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

        cur.execute('update ordenes_venta set total=(select coalesce(sum(subtotal),0) from orden_items where orden_id=%s) where id=%s returning *', (orden_id, orden_id))
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


@app.get('/reportes/ventas')
def reporte_ventas(
  fecha_inicio: str | None = None,
  fecha_fin: str | None = None,
  _usuario: dict = Depends(get_current_user),
):
  if not fecha_inicio:
    fecha_inicio = '1970-01-01'
  if not fecha_fin:
    fecha_fin = '2999-12-31'

  params = (fecha_inicio, fecha_fin)

  resumen = fetch_one('''
    select
      (select coalesce(count(*), 0) from ordenes_venta where estado!='ANULADA' and fecha::date>=%s::date and fecha::date<=%s::date) as total_ventas,
      (select coalesce(sum(total), 0) from ordenes_venta where estado!='ANULADA' and fecha::date>=%s::date and fecha::date<=%s::date) as total_ingresos,
      (select coalesce(sum(case when tipo='ENTRADA' then cantidad else 0 end), 0) from movimientos_inventario where created_at::date>=%s::date and created_at::date<=%s::date) as total_entradas,
      (select coalesce(sum(case when tipo='SALIDA' then cantidad else 0 end), 0) from movimientos_inventario where created_at::date>=%s::date and created_at::date<=%s::date) as total_salidas
  ''', params + params + params + params)

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
  ''', params + params + params)

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


@app.get('/auditoria')
def listar_auditoria(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    select id, usuario, accion, tabla_afectada, registro_id, valores_anteriores,
           valores_nuevos, ip_conexion, created_at
    from auditoria
    order by created_at desc, id desc
    limit 100
  ''')