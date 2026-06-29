# InveSys Desktop — Plan de ejecución

## Objetivo
Convertir InveSys (sistema web) en app de escritorio con Tauri, con auto-updates, almacenamiento en Cloudinary, y modelo de negocio: setup fee + suscripción mensual.

---

## ✅ Completado

### Fase 0 — Limpieza y Cloudinary
- [x] Archivos basura eliminados
- [x] `.gitignore` actualizado
- [x] Avatares migrados a Cloudinary (con fallback local)

### Fase 1 — App de escritorio Tauri
- [x] Tauri CLI instalado e inicializado
- [x] `tauri.conf.json` configurado (MSI, español, 1200x800)
- [x] `api.js` configurable vía localStorage
- [x] Pantalla de configuración inicial (Setup.jsx)
- [x] System tray (minimizar a bandeja)
- [x] Build exitoso — `InveSys_1.0.0_x64_es-ES.msi` (~3.8 MB)
- [x] Release v1.0.0 publicado en GitHub Releases

### Fase 2 — Auto-updates
- [x] `tauri-plugin-updater` configurado
- [x] Clave de firma generada
- [x] MSI firmado
- [x] `latest.json` creado y subido al repo
- [x] Secrets de GitHub configurados
- [x] Workflow de GitHub Actions actualizado

### Fase 4 — Script de despliegue
- [x] `DEPLOY_CLIENTE.md` — guía paso a paso para desplegar un cliente

### Fase 5 — Preparar venta
- [x] `SELL.md` — material de venta con features, precios, pitch, dónde vender

---

## 📋 Pendiente (baja prioridad)

### Fase 3 — Cloudinary para imágenes de productos
- [ ] Frontend: subir imágenes directo a Cloudinary
- [ ] Agregar campo `imagen_url` a productos
- [ ] Backend: eliminar dependencia de archivos locales

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

## Estado actual del proyecto

```
inveSys/
├── backend/          ← API + Cloudinary para avatares
├── src/              ← React con Setup.jsx (configuración inicial)
├── src-tauri/        ← App de escritorio (Tauri) — MSI compilado
├── .github/workflows/ ← Release automático con tags v*
├── latest.json       ← Auto-updates
├── DEPLOY_CLIENTE.md ← Guía para desplegar clientes
├── SELL.md           ← Material de venta
└── PLAN.md           ← Este plan
```
