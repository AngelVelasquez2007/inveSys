# InveSys — Sistema de Gestión de Inventario

> **Inventario claro, decisiones rápidas**

![Status](https://img.shields.io/badge/status-producci%C3%B3n-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-Vercel-000?logo=vercel)
![Backend](https://img.shields.io/badge/backend-Render-46E3B7?logo=render)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)

InveSys es una aplicación web full-stack para la gestión integral de inventario, ventas, clientes y proveedores, desarrollada como proyecto final de la asignatura de Bases de Datos. El sistema combina **React + Vite** en el frontend, **FastAPI** en el backend y **PostgreSQL** como motor de base de datos, con autenticación JWT, auditoría automática vía triggers y generación de reportes en PDF.

---

## Tabla de contenido

- [Enlaces de producción](#enlaces-de-producción)
- [Equipo de desarrollo](#equipo-de-desarrollo)
- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Instalación y puesta en marcha (local)](#instalación-y-puesta-en-marcha-local)
- [Despliegue en producción](#despliegue-en-producción)
- [Variables de entorno](#variables-de-entorno)
- [Uso del sistema](#uso-del-sistema)
- [Modelo de datos](#modelo-de-datos)
- [Documentación adicional](#documentación-adicional)
- [Licencia](#licencia)

---

## Enlaces de producción

| Componente | URL |
|---|---|
| **Frontend (SPA)** | [https://invesys.vercel.app](https://invesys.vercel.app) |
| **Backend (API REST)** | [https://proyecto-final-bdd-i.onrender.com](https://proyecto-final-bdd-i.onrender.com) |
| **Repositorio** | [https://github.com/AngelVelasquez2007/Proyecto-Final-BDD-I](https://github.com/AngelVelasquez2007/Proyecto-Final-BDD-I) |

> ⚠️ El backend en Render (plan free) se duerme tras 15 minutos de inactividad. La primera solicitud puede tardar ~30 segundos en responder (*cold start*).

---

## Equipo de desarrollo

| Integrante | Rol | Responsabilidades |
|---|---|---|
| **Daniel Pinzón** | Frontend Developer | React, enrutamiento, vistas CRUD, autenticación de UI, diseño responsive |
| **Angel Velázquez** | Backend Developer / Scrum Master | FastAPI, JWT, endpoints REST, validaciones, generación de reportes PDF |
| **Jhoan Gómez** | Base de Datos | Modelado ER, esquema PostgreSQL, triggers de auditoría, procedimientos y funciones |
| **Oscar Macías** | Documentación / Control de calidad | Manuales, ficha técnica, análisis de rendimiento, estructura del repositorio en GitHub, validación de cumplimiento de requisitos y mantenimiento del README |

---

## Características principales

- **Autenticación segura** con JWT y contraseñas cifradas (passlib).
- **Gestión de productos** con control de stock mínimo y proveedor principal.
- **Categorías y proveedores** administrables desde la interfaz.
- **Módulo de ventas** con órdenes, ítems, cálculo automático de totales y control de estado (`PENDIENTE`, `PAGADA`, `ANULADA`, `DESPACHADA`).
- **Gestión de clientes** con eliminación lógica.
- **Control de inventario** mediante movimientos de tipo `ENTRADA` y `SALIDA`, con validación de stock contra negativos.
- **Auditoría automática** de todas las operaciones `INSERT`, `UPDATE` y `DELETE` mediante triggers de PostgreSQL, sin intervención del backend.
- **Reportes en PDF** con resumen de ventas, ranking de productos y movimientos de inventario, generados con `fpdf2`.
- **Dashboard** con indicadores clave: productos activos, stock total, clientes activos, alertas de bajo stock y últimas ventas.
- **Despliegue en la nube** con frontend en Vercel, backend y base de datos en Render.

---

## Stack tecnológico

### Frontend
- React 19
- Vite 8
- React Router DOM 7
- Axios
- Lucide React (íconos)

### Backend
- Python 3.11+
- FastAPI 0.115
- Uvicorn (ASGI)
- Psycopg 3 (driver PostgreSQL)
- PyJWT + Passlib (autenticación)
- FPDF2 (generación de reportes PDF)
- Pydantic (validación de datos)

### Base de datos
- PostgreSQL 16
- PL/pgSQL (procedimientos, funciones y triggers)
- JSONB (almacenamiento de auditoría)

---

## Estructura del repositorio

```
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # Endpoints REST (productos, clientes, ventas, etc.)
│   │   ├── auth.py                # Login, registro, JWT y middleware de autenticación
│   │   ├── database.py            # Conexión a PostgreSQL (psycopg3)
│   │   └── reportes.py            # Generación de reportes PDF (FPDF2)
│   ├── requirements.txt           # Dependencias de Python
│   └── .env.example               # Plantilla de variables de entorno del backend
├── sql/
│   ├── ddl/
│   │   ├── 01_schema.sql                     # Definición de tablas, PK, FK, CHECK e índices
│   │   ├── 02_auditoria_triggers.sql         # Función y triggers de auditoría automática
│   │   ├── 03_procedures_functions.sql       # Procedimientos y funciones almacenadas
│   │   └── 04_migrar_usuarios.sql            # Migración para esquemas antiguos de usuarios
│   ├── dml/
│   │   └── 01_seed.sql                       # Datos iniciales de prueba
│   ├── queries/
│   │   └── 01_consultas_demostracion.sql     # Consultas de demostración del modelo
│   └── README.md                             # Orden de ejecución de los scripts SQL
├── docs/                           # Documentación del proyecto (manuales, fichas, análisis)
├── src/
│   ├── components/
│   │   ├── Layout.jsx              # Estructura general con menú lateral
│   │   └── ProtectedRoute.jsx      # Protección de rutas autenticadas
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Productos.jsx
│   │   ├── Categorias.jsx
│   │   ├── Proveedores.jsx
│   │   ├── Ventas.jsx
│   │   ├── Clientes.jsx
│   │   ├── Inventario.jsx
│   │   └── Auditoria.jsx
│   ├── services/
│   │   ├── api.js                  # Cliente Axios + interceptores (token, errores)
│   │   └── authService.js          # Login, registro y manejo de sesión
│   ├── assets/
│   ├── App.jsx                     # Enrutamiento principal y contexto de notificaciones
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── public/
├── index.html
├── package.json
├── vite.config.js                  # Configuración de Vite + proxy hacia el backend
├── vercel.json                     # Configuración de despliegue en Vercel
```

---

## Requisitos previos

- **PostgreSQL** 12 o superior
- **Python** 3.11 o superior
- **Node.js** 18 o superior

---

## Instalación y puesta en marcha (local)

### 1. Base de datos

Crear la base de datos:

```sql
create database invesys;
```

Ejecutar los scripts en el orden indicado en [`sql/README.md`](sql/README.md):

```powershell
psql -d invesys -f sql/ddl/01_schema.sql
psql -d invesys -f sql/ddl/02_auditoria_triggers.sql
psql -d invesys -f sql/ddl/03_procedures_functions.sql
psql -d invesys -f sql/dml/01_seed.sql
```

> Si la base de datos ya existía con un esquema previo de `usuarios`, ejecutar primero `sql/ddl/04_migrar_usuarios.sql`.

### 2. Backend (FastAPI)

```powershell
copy backend\.env.example backend\.env
cd backend
python -m venv .venv
.venv\Scripts\pip.exe install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Al iniciar, el backend crea automáticamente un usuario administrador si no existe:

```
correo:      admin@invesys.com
contraseña:  Admin123!
```

### 3. Frontend (React + Vite)

```powershell
npm install
npm run dev
```

Abrir en el navegador:

```
http://127.0.0.1:5173/
```

El frontend se conecta al backend mediante el proxy configurado en `vite.config.js` (`/api` → `http://localhost:8000`).

---

## Despliegue en producción

| Componente | Plataforma | URL |
|---|---|---|
| **Frontend** | Vercel (plan free) | [https://invesys.vercel.app](https://invesys.vercel.app) |
| **Backend** | Render Web Service (plan free) | [https://proyecto-final-bdd-i.onrender.com](https://proyecto-final-bdd-i.onrender.com) |
| **Base de datos** | Render PostgreSQL (plan free, expira a los 90 días) | — |

### Notas del despliegue

- El frontend se despliega automáticamente desde el repo en Vercel. Usa `VITE_API_URL` para apuntar al backend en Render.
- El backend en Render tiene `DATABASE_URL` configurada como variable de entorno apuntando a la base de datos PostgreSQL de Render.
- Los campos de login usan `correo` y `contrasena` (no `email`/`password`) tanto en frontend como en backend.
- Render free tier: el backend se duerme tras 15 min sin actividad; la primera solicitud del día tarda ~30s en responder.

---

## Variables de entorno

El archivo `backend/.env.example` contiene la plantilla de configuración. Copiarlo como `.env` y ajustar según el entorno:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgresql://postgres:postgres@localhost:5432/invesys` |
| `APP_USER` | Usuario lógico registrado en cada operación de auditoría | `api_user` |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT | *(definir en producción)* |
| `JWT_EXPIRE_MINUTES` | Minutos de validez del token de acceso | `480` |

---

## Uso del sistema

1. **Entorno local**: acceder a `http://127.0.0.1:5173/login` e iniciar sesión.
   **Producción**: ingresar a [https://invesys.vercel.app](https://invesys.vercel.app).
2. Iniciar sesión con el usuario administrador (`admin@invesys.com` / `Admin123!`) o registrar una cuenta nueva desde el botón **Crear cuenta**.
3. Navegar por el menú lateral entre los módulos: Dashboard, Productos, Categorías, Proveedores, Ventas, Clientes, Inventario y Auditoría.
4. Registrar movimientos de inventario y órdenes de venta; el sistema actualiza el stock automáticamente mediante los procedimientos almacenados.
5. Consultar el módulo de Auditoría para ver el historial de cambios capturado por los triggers de PostgreSQL.
6. Descargar reportes de ventas en PDF desde el módulo correspondiente, filtrando por rango de fechas.

---

## Modelo de datos

El esquema cuenta con **11 tablas** relacionadas, normalizadas hasta la 4FN, incluyendo una relación muchos a muchos (`producto_proveedor`), auditoría automática mediante triggers, **3 procedimientos almacenados**, **3 funciones personalizadas** y un conjunto de consultas de demostración. El detalle completo del modelo entidad-relación, el diccionario de datos y el proceso de normalización se encuentra documentado en la carpeta [`docs/`](docs/).

---

## Documentación adicional

La carpeta [`docs/`](docs/) contiene la documentación funcional y técnica del proyecto:

- Manual de Usuario
- Ficha Técnica del Equipo
- Análisis de Rendimiento y Optimización
- Diccionario de Datos
- Modelos de Diseño (ER, relacional, físico)
- Proceso de Normalización
- Manual de Instalación
- Guiones para videos de presentación

---

## Licencia

Proyecto académico desarrollado con fines educativos para la asignatura de Bases de Datos. Uso libre para fines de aprendizaje.
