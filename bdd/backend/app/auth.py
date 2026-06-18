import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWTError
from passlib.context import CryptContext
from pydantic import BaseModel

from .database import get_conn

load_dotenv()

SECRET_KEY = os.getenv('JWT_SECRET', 'cambiar_en_produccion')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '480'))

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix='/auth', tags=['auth'])


class LoginIn(BaseModel):
    correo: str
    contrasena: str


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


@router.post('/login')
def login(payload: LoginIn):
    if not payload.correo or not payload.contrasena:
        raise HTTPException(status_code=400, detail='Correo y contraseña requeridos')

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, nombre, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo=%s',
                (payload.correo.strip().lower(),),
            )
            row = cur.fetchone()

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
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, nombre, correo, rol FROM usuarios WHERE id=%s AND activo',
                (usuario['id'],),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    return row
