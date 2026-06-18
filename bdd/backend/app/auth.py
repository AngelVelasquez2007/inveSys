import os
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


class RegistroIn(BaseModel):
    nombre: str
    correo: str
    contrasena: str = Field(min_length=6, max_length=128)


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str


def crear_token(usuario_id: int, correo: str, rol: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {'sub': str(usuario_id), 'correo': correo, 'rol': rol, 'exp': expira},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


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
        if usuario_id is None or correo is None:
            raise HTTPException(status_code=401, detail='Token inválido')
        return {'id': int(usuario_id), 'correo': correo, 'rol': rol}
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


@router.post('/register', status_code=201)
def register(payload: RegistroIn):
    if not payload.nombre or not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Todos los campos son requeridos')

    if len(payload.nombre.strip()) < 3:
        raise HTTPException(status_code=400, detail='El nombre debe tener al menos 3 caracteres')

    if len(payload.contrasena) < 6:
        raise HTTPException(status_code=400, detail='La contraseña debe tener al menos 6 caracteres')

    correo = payload.correo.strip().lower()

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT id FROM usuarios WHERE correo=%s', (correo,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail='El correo ya está registrado')

                hash_ = pwd_context.hash(payload.contrasena)
                cur.execute(
                    'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (%s, %s, %s, %s)',
                    (payload.nombre.strip(), correo, hash_, 'OPERADOR'),
                )
                conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error al registrar usuario: {e}')

    return {'mensaje': 'Cuenta creada correctamente'}


@router.post('/login')
def login(payload: LoginIn):
    if not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Correo y contraseña requeridos')

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, nombre, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo=%s',
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

    token = crear_token(row['id'], row['correo'], row['rol'])

    return {
        'access_token': token,
        'token_type': 'bearer',
        'usuario': {
            'id': row['id'],
            'nombre': row['nombre'],
            'correo': row['correo'],
            'rol': row['rol'],
        },
    }


@router.get('/me', response_model=UsuarioOut)
def me(usuario: dict = Depends(get_current_user)):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT id, nombre, correo, rol FROM usuarios WHERE id=%s AND activo',
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
