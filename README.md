# BRK Dashboard Comercial

Dashboard interno de seguimiento comercial BRK. Vanilla HTML/CSS/JS, sin build, sin frameworks.

## Seguridad
- Ningún dato de ventas, aliados o cifras vive en este código.
- El front solo llama funciones RPC (`security definer`) en Supabase que validan sesión con token antes de devolver cualquier dato.
- La `anon key` en `index.html` es pública por diseño (patrón estándar de Supabase) — no da acceso directo a las tablas, que tienen RLS activo sin policies.

## Despliegue (Vercel)
1. Crear repo nuevo en GitHub: `brk-dashboard-comercial`
2. Subir estos archivos (ver bloque git abajo)
3. En Vercel: **Add New Project** → importar el repo → Framework: **Other** (sitio estático) → Deploy
4. No requiere variables de entorno ni build command

## Acceso
Usuario: `carlos.gomez@brkbrakes.com` — cambia la contraseña temporal (`BRK2026Temp!`) desde la consola SQL de Supabase o pide a Claude que ejecute `dash_cambiar_password`.

## Carga mensual de datos
Por ahora la carga de ventas/histórico se hace vía **Table Editor → Import CSV** en Supabase (ver conversación con Claude). Un uploader integrado en la app queda pendiente para una siguiente iteración.
