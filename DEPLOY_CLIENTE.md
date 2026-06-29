# Despliegue para nuevo cliente

Sigue estos pasos cada vez que consigas un cliente nuevo.

---

## 1. Recibir pago del cliente

- [ ] Cobrar **setup fee** ($49-79 USD) + **primer mes** ($19-29 USD)
- [ ] Confirmar datos del cliente:
  - Nombre de empresa
  - Nombre del administrador
  - Correo del administrador
  - Nombre de sucursal(es)

---

## 2. Crear base de datos en Render

1. Ve a https://dashboard.render.com/new/database
2. Selecciona **PostgreSQL**
3. Llenar:
   - **Name:** `invesys-cliente1` (o el nombre del cliente)
   - **Database:** `invesys`
   - **User:** `invesys_user`
   - **Plan:** Free ($0/mes)
4. Crear
5. Esperar a que se despliegue (2-3 min)
6. Copiar la **Internal Database URL** (empieza con `postgresql://...`)

---

## 3. Ejecutar scripts SQL

Usando cualquier cliente PostgreSQL (pgAdmin, DBeaver, o psql):

```bash
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/01_schema.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/02_auditoria_triggers.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/03_procedures_functions.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/05_roles_empresas_sucursales.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/07_pos_campos.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/08_avatar_mensajes_descuentos.sql
psql "LA_URL_INTERNA_DE_RENDER" -f sql/ddl/09_descuento_orden.sql
```

---

## 4. Desplegar backend en Render

1. Ve a https://dashboard.render.com/select-repo
2. Conecta tu repo: `AngelVelasquez2007/inveSys`
3. Configurar:
   - **Name:** `invesys-api-cliente1`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** (Advanced):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La Internal Database URL de Render (paso 2) |
| `APP_USER` | `api_user` |
| `JWT_SECRET` | Generar con: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `JWT_EXPIRE_MINUTES` | `480` |
| `CLOUDINARY_URL` | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (ver paso 5) |
| `PYTHON_VERSION` | `3.11.7` |

5. **Plan:** Free ($0/mes los primeros 90 días, luego $7/mes)
6. Crear Web Service
7. Esperar a que termine el deploy (5-10 min)
8. Copiar la URL del servicio (ej: `https://invesys-api-cliente1.onrender.com`)

---

## 5. Configurar Cloudinary

Si no tienes cuenta:
1. Ve a https://cloudinary.com/register (gratis, 25GB)
2. Copia la `CLOUDINARY_URL` del Dashboard
3. Úsala en las variables de entorno del backend

---

## 6. Probar que funciona

```bash
# Probar que el backend responde
curl https://invesys-api-cliente1.onrender.com/docs

# Deberías ver la documentación de FastAPI (Swagger)
```

---

## 7. Entregar al cliente

- [ ] Darle la **URL del backend**: `https://invesys-api-cliente1.onrender.com`
- [ ] Darle el **instalador MSI** (descarga de GitHub Releases):
      `https://github.com/AngelVelasquez2007/inveSys/releases/latest`
- [ ] Instrucciones:
  1. Descargar e instalar el `.msi`
  2. Abrir la aplicación
  3. En la pantalla de configuración, pegar la URL del servidor
  4. Hacer clic en "Probar conexión"
  5. Si sale "Conexión exitosa", hacer clic en "Guardar y continuar"
  6. Iniciar sesión con las credenciales del administrador

---

## Costos por cliente

| Servicio | Costo/mes |
|---|---|
| Render PostgreSQL (Free) | $0 |
| Render Web Service (Free 90 días, luego $7) | $7 |
| Cloudinary | $0 (25GB incluidos) |
| **Total** | **~$7/mes** |
| **Suscripción que cobras** | **$19-29/mes** |
| **Tu ganancia** | **$12-22/mes por cliente** |
