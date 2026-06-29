import os
import secrets
import string
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWTError
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from .database import get_conn

load_dotenv()

SECRET_KEY = os.getenv('JWT_SECRET', 'cambiar_en_produccion')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '480'))

pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix='/auth', tags=['auth'])


class LoginIn(BaseModel):
    correo: str
    contrasena: str


class RegistroAdminIn(BaseModel):
    nombre: str
    correo: str
    contrasena: str = Field(min_length=6, max_length=128)
    nombre_empresa: str = Field(min_length=2, max_length=255)


class RegistroUsuarioIn(BaseModel):
    nombre: str
    correo: str
    contrasena: str = Field(min_length=6, max_length=128)
    codigo_admin: str = Field(min_length=1, max_length=10)
    sucursal_id: int | None = None


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    empresa_id: int | None = None
    sucursal_id: int | None = None


class ActualizarPerfilIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=120)


class CambiarContrasenaIn(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str = Field(min_length=6, max_length=128)


def generar_codigo_admin() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def crear_token(usuario_id: int, correo: str, rol: str, empresa_id: int | None = None, sucursal_id: int | None = None) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': str(usuario_id),
        'correo': correo,
        'rol': rol,
        'exp': expira,
    }
    if empresa_id is not None:
        payload['empresa_id'] = empresa_id
    if sucursal_id is not None:
        payload['sucursal_id'] = sucursal_id
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    if credentials is None or credentials.credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token de acceso requerido',
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get('sub')
        correo = payload.get('correo')
        rol = payload.get('rol')
        empresa_id = payload.get('empresa_id')
        sucursal_id = payload.get('sucursal_id')
        if usuario_id is None or correo is None:
            raise HTTPException(status_code=401, detail='Token inválido')
        return {
            'id': int(usuario_id),
            'correo': correo,
            'rol': rol,
            'empresa_id': empresa_id,
            'sucursal_id': sucursal_id,
        }
    except PyJWTError:
        raise HTTPException(status_code=401, detail='Token inválido o expirado')


def seed_admin():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM usuarios WHERE correo=%s", ('admin@invesys.com',))
                if cur.fetchone() is None:
                    hash_ = pwd_context.hash('Admin123!')
                    cur.execute(
                        "INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (%s, %s, %s, %s)",
                        ('Admin', 'admin@invesys.com', hash_, 'ADMIN'),
                    )
                    conn.commit()
                    print('Usuario admin creado: admin@invesys.com / Admin123!')
    except Exception as e:
        print(f'No se pudo crear admin por defecto: {e}')


@router.post('/register/admin', status_code=201)
def register_admin(payload: RegistroAdminIn):
    if not payload.nombre or not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Todos los campos son requeridos')

    nombre_empresa = payload.nombre_empresa.strip()
    if len(nombre_empresa) < 2:
        raise HTTPException(status_code=400, detail='El nombre de la empresa debe tener al menos 2 caracteres')

    correo = payload.correo.strip().lower()

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT id FROM usuarios WHERE correo=%s', (correo,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail='El correo ya está registrado')

                codigo = generar_codigo_admin()
                while True:
                    cur.execute('SELECT id FROM empresas WHERE codigo_admin=%s', (codigo,))
                    if not cur.fetchone():
                        break
                    codigo = generar_codigo_admin()

                cur.execute(
                    'INSERT INTO empresas (nombre, codigo_admin) VALUES (%s, %s) RETURNING id',
                    (nombre_empresa, codigo),
                )
                empresa_id = cur.fetchone()['id']

                hash_ = pwd_context.hash(payload.contrasena)
                cur.execute(
                    '''INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id)
                       VALUES (%s, %s, %s, 'ADMIN', %s)''',
                    (payload.nombre.strip(), correo, hash_, empresa_id),
                )

                cur.execute(
                    'UPDATE empresas SET usuario_admin_id=(SELECT id FROM usuarios WHERE correo=%s) WHERE id=%s',
                    (correo, empresa_id),
                )

                conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al registrar administrador: {e}')

    return {
        'mensaje': 'Cuenta de administrador creada correctamente',
        'codigo_admin': codigo,
    }


@router.post('/register/usuario', status_code=201)
def register_usuario(payload: RegistroUsuarioIn):
    if not payload.nombre or not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Todos los campos son requeridos')

    correo = payload.correo.strip().lower()

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT id FROM usuarios WHERE correo=%s', (correo,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail='El correo ya está registrado')

                cur.execute('SELECT id, nombre FROM empresas WHERE codigo_admin=%s', (payload.codigo_admin.strip().upper(),))
                empresa = cur.fetchone()
                if not empresa:
                    raise HTTPException(status_code=404, detail='Código de administrador inválido')

                empresa_id = empresa['id']

                if payload.sucursal_id:
                    cur.execute(
                        'SELECT id FROM sucursales WHERE id=%s AND empresa_id=%s',
                        (payload.sucursal_id, empresa_id),
                    )
                    if not cur.fetchone():
                        raise HTTPException(status_code=404, detail='Sucursal no válida para esta empresa')

                hash_ = pwd_context.hash(payload.contrasena)
                if payload.sucursal_id:
                    cur.execute(
                        '''INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id, sucursal_id)
                           VALUES (%s, %s, %s, 'OPERADOR', %s, %s)''',
                        (payload.nombre.strip(), correo, hash_, empresa_id, payload.sucursal_id),
                    )
                else:
                    cur.execute(
                        '''INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, empresa_id)
                           VALUES (%s, %s, %s, 'OPERADOR', %s)''',
                        (payload.nombre.strip(), correo, hash_, empresa_id),
                    )

                conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al registrar usuario: {e}')

    return {'mensaje': 'Cuenta creada correctamente. Espera a que el administrador te active.'}


@router.post('/verificar-codigo')
def verificar_codigo(payload: dict):
    codigo = payload.get('codigo_admin', '').strip().upper()
    if not codigo:
        raise HTTPException(status_code=400, detail='Código requerido')

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT e.id, e.nombre FROM empresas e WHERE e.codigo_admin=%s',
                    (codigo,),
                )
                empresa = cur.fetchone()
                if not empresa:
                    raise HTTPException(status_code=404, detail='Código de administrador inválido')

                cur.execute(
                    'SELECT id, nombre FROM sucursales WHERE empresa_id=%s ORDER BY nombre',
                    (empresa['id'],),
                )
                sucursales = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al verificar código: {e}')

    return {
        'empresa_id': empresa['id'],
        'empresa_nombre': empresa['nombre'],
        'sucursales': [{'id': s['id'], 'nombre': s['nombre']} for s in sucursales],
    }


@router.post('/login')
def login(payload: LoginIn):
    if not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Correo y contraseña requeridos')

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''SELECT id, nombre, correo, contrasena_hash, rol, activo,
                              empresa_id, sucursal_id
                       FROM usuarios WHERE correo=%s''',
                    (payload.correo.strip().lower(),),
                )
                row = cur.fetchone()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Error de base de datos al iniciar sesión: {e}',
        )

    if row is None:
        raise HTTPException(status_code=401, detail='Credenciales inválidas')

    if not row['activo']:
        raise HTTPException(status_code=403, detail='Cuenta desactivada')

    if not pwd_context.verify(payload.contrasena, row['contrasena_hash']):
        raise HTTPException(status_code=401, detail='Credenciales inválidas')

    token = crear_token(
        row['id'], row['correo'], row['rol'],
        row.get('empresa_id'), row.get('sucursal_id'),
    )

    usuario_respuesta = {
        'id': row['id'],
        'nombre': row['nombre'],
        'correo': row['correo'],
        'rol': row['rol'],
        'empresa_id': row.get('empresa_id'),
        'sucursal_id': row.get('sucursal_id'),
        'avatar_url': row.get('avatar_url'),
    }

    if row.get('empresa_id'):
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT nombre, codigo_admin FROM empresas WHERE id=%s',
                    (row['empresa_id'],),
                )
                emp = cur.fetchone()
                if emp:
                    usuario_respuesta['empresa_nombre'] = emp['nombre']
                    usuario_respuesta['codigo_admin'] = emp['codigo_admin']

    if row.get('sucursal_id'):
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT nombre FROM sucursales WHERE id=%s',
                    (row['sucursal_id'],),
                )
                suc = cur.fetchone()
                if suc:
                    usuario_respuesta['sucursal_nombre'] = suc['nombre']

    return {
        'access_token': token,
        'token_type': 'bearer',
        'usuario': usuario_respuesta,
    }


@router.get('/me')
def me(usuario: dict = Depends(get_current_user)):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''SELECT u.id, u.nombre, u.correo, u.rol,
                              u.empresa_id, u.sucursal_id, u.created_at, u.avatar_url,
                              e.nombre as empresa_nombre, e.codigo_admin,
                              s.nombre as sucursal_nombre
                       FROM usuarios u
                       LEFT JOIN empresas e ON e.id = u.empresa_id
                       LEFT JOIN sucursales s ON s.id = u.sucursal_id
                       WHERE u.id=%s AND u.activo''',
                    (usuario['id'],),
                )
                row = cur.fetchone()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Error de base de datos al obtener usuario: {e}',
        )
    if row is None:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    return row


@router.put('/me')
def actualizar_perfil(payload: ActualizarPerfilIn, usuario: dict = Depends(get_current_user)):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE usuarios SET nombre=%s WHERE id=%s RETURNING id, nombre, correo, rol',
                    (payload.nombre.strip(), usuario['id']),
                )
                row = cur.fetchone()
                conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al actualizar perfil: {e}')

    return row


@router.put('/me/password')
def cambiar_contrasena(payload: CambiarContrasenaIn, usuario: dict = Depends(get_current_user)):
    if payload.contrasena_actual == payload.contrasena_nueva:
        raise HTTPException(status_code=400, detail='La nueva contraseña debe ser diferente a la actual')

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT contrasena_hash FROM usuarios WHERE id=%s',
                    (usuario['id'],),
                )
                row = cur.fetchone()
                if row is None:
                    raise HTTPException(status_code=404, detail='Usuario no encontrado')

                if not pwd_context.verify(payload.contrasena_actual, row['contrasena_hash']):
                    raise HTTPException(status_code=400, detail='La contraseña actual no es correcta')

                hash_ = pwd_context.hash(payload.contrasena_nueva)
                cur.execute(
                    'UPDATE usuarios SET contrasena_hash=%s WHERE id=%s',
                    (hash_, usuario['id']),
                )
                conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al cambiar contraseña: {e}')

    return {'mensaje': 'Contraseña actualizada correctamente'}


@router.get('/me/empresa')
def empresa_info(usuario: dict = Depends(get_current_user)):
    eid = usuario.get('empresa_id')
    if not eid:
        return None

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''SELECT e.id, e.nombre, e.codigo_admin, e.created_at,
                              (SELECT count(*) FROM sucursales WHERE empresa_id=e.id) as total_sucursales,
                              (SELECT count(*) FROM usuarios WHERE empresa_id=e.id) as total_usuarios
                       FROM empresas e WHERE e.id=%s''',
                    (eid,),
                )
                return cur.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al obtener información de la empresa: {e}')


@router.post('/me/regenerar-codigo')
def regenerar_codigo(usuario: dict = Depends(get_current_user)):
    if usuario['rol'] != 'ADMIN':
        raise HTTPException(status_code=403, detail='Solo administradores pueden regenerar el código')

    eid = usuario.get('empresa_id')
    if not eid:
        raise HTTPException(status_code=400, detail='No tienes una empresa asociada')

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                codigo = generar_codigo_admin()
                while True:
                    cur.execute('SELECT id FROM empresas WHERE codigo_admin=%s', (codigo,))
                    if not cur.fetchone():
                        break
                    codigo = generar_codigo_admin()

                cur.execute(
                    'UPDATE empresas SET codigo_admin=%s WHERE id=%s RETURNING codigo_admin',
                    (codigo, eid),
                )
                conn.commit()
                return {'codigo_admin': cur.fetchone()['codigo_admin']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al regenerar código: {e}')
