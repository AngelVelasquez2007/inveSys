from decimal import Decimal
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .auth import router as auth_router, get_current_user, seed_admin
from .database import get_conn

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
  tipo: Literal['ENTRADA', 'SALIDA', 'AJUSTE']
  cantidad: int = Field(gt=0)
  motivo: str = Field(min_length=3, max_length=160)


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
  return {'resumen': resumen, 'bajo_stock': bajo_stock}


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
  row = fetch_one(
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
  if payload.proveedor_id:
    with get_conn() as conn:
      with conn.cursor() as cur:
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
  delta = payload.cantidad if payload.tipo in ('ENTRADA', 'AJUSTE') else -payload.cantidad
  with get_conn() as conn:
    try:
      with conn.cursor() as cur:
        cur.execute('call sp_actualizar_stock_producto(%s, %s, %s)', (payload.producto_id, delta, payload.motivo))
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


@app.get('/auditoria')
def listar_auditoria(_usuario: dict = Depends(get_current_user)):
  return fetch_all('''
    select id, usuario, accion, tabla_afectada, registro_id, valores_anteriores,
           valores_nuevos, ip_conexion, created_at
    from auditoria
    order by created_at desc, id desc
    limit 100
  ''')