# InveSys Desktop — Plan de ejecución

## Objetivo
Convertir InveSys (sistema web) en app de escritorio con Tauri, con auto-updates, almacenamiento en Cloudinary, y modelo de negocio: setup fee + suscripción mensual.

---

## Fase 0 — Limpieza y Cloudinary (Día 1)

- [x] 0.1 Borrar archivos basura (`App copy.jsx`, `main copy.jsx`, `services copy/`)
- [x] 0.2 Crear `.gitignore` adecuado (excluir `.env`, `uploads/`, `node_modules/`, `dist/`, `src-tauri/target/`)
- [x] 0.3 Reemplazar almacenamiento local de avatares por Cloudinary
  - Instalar `cloudinary` en backend (`requirements.txt`)
  - Agregar `CLOUDINARY_URL` en `.env.example`
  - Modificar `subir_avatar()` en `main.py` para usar Cloudinary
  - Mantener compatibilidad con avatar_url en DB

## Fase 1 — App de escritorio Tauri (Día 2-4)

- [x] 1.1 Instalar Tauri CLI y dependencias
- [x] 1.2 Ejecutar `npx tauri init`
- [x] 1.3 Configurar `tauri.conf.json`
  - `frontendDist: "../dist"`
  - `devUrl: "http://localhost:5173"`
  - Bundle target: msi
  - Idioma instalador: español
- [x] 1.4 Hacer que `api.js` obtenga la URL del backend de `localStorage` (configurable)
- [x] 1.5 Crear pantalla de "Configuración inicial" (solo primera vez)
- [x] 1.6 Compilar y probar: `npx tauri build`
- [x] 1.7 Agregar system tray (minimizar a bandeja)

## Fase 2 — Auto-updates (Día 5)

- [x] 2.2 Configurar `tauri-plugin-updater` en Cargo.toml y lib.rs
- [x] 2.3 Generar clave pública/privada para firmar updates
- [ ] 2.1 Crear repo público `invesys-releases` en GitHub (pendiente)
- [ ] 2.4 Crear primer release y probar flujo de actualización
- [ ] 2.5 Configurar GitHub Actions (workflow creado, falta configurar secrets)

## Fase 3 — Cloudinary para imágenes de productos (Día 6)

- [ ] 3.1 Frontend: subir imágenes directo a Cloudinary (unsigned upload)
- [ ] 3.2 Agregar campo `imagen_url` a productos (opcional)
- [ ] 3.3 Backend: eliminar dependencia de archivos locales

## Fase 4 — Script de despliegue (Día 7-8)

- [ ] 4.1 Crear script/documento para desplegar instancia por cliente
- [ ] 4.2 Automatizar: crear DB → ejecutar SQL → deploy backend
- [ ] 4.3 Probar flujo completo con un cliente beta

## Fase 5 — Preparar venta (Día 9-10)

- [ ] 5.1 Landing page simple con features y precios
- [ ] 5.2 Documentación para el cliente ("Cómo empezar con InveSys")
- [ ] 5.3 Sistema de licencias básico
- [ ] 5.4 Publicar en Gumroad, grupos de Facebook, Fiverr

---

## Modelo de negocio

| Producto | Precio |
|---|---|
| Setup fee (único) | $49-79 USD |
| Suscripción mensual | $19-29 USD/mes |
| Licencia código fuente | $199-299 USD |

## Costos

| Servicio | Costo |
|---|---|
| Tauri | $0 |
| GitHub | $0 |
| Cloudinary (25GB) | $0 |
| Render / Supabase | ~$7-15/mes (lo paga el setup fee) |
| **Inversión inicial** | **$0** |
