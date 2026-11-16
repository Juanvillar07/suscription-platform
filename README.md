# Plataforma de suscripciones con Mercado Pago

Backend **NestJS + Prisma + PostgreSQL**, frontend **React + TypeScript + Vite + Tailwind + shadcn/ui**.
Cobro recurrente con **Mercado Pago Suscripciones** (`preapproval_plan` + `preapproval`) en Colombia (COP).

```
backend/    API REST en /api (auth JWT, planes, suscripciones, pagos, webhooks, admin)
frontend/   SPA (pricing, checkout con Card Payment Brick, panel de usuario, admin)
docker-compose.yml   PostgreSQL 16
```

## 1. Requisitos
- Node 22+, Docker Desktop
- Usuarios de prueba de Mercado Pago (vendedor y comprador, ambos de Colombia)
- `ngrok` (o `cloudflared`) para recibir webhooks en local

## 2. Credenciales de Mercado Pago
1. Inicia sesión en Mercado Pago Developers **con el usuario VENDEDOR de prueba**.
2. Crea una aplicación (producto: *Suscripciones*).
3. En *Credenciales de producción* de esa app copia `Access Token` y `Public Key` (empiezan por `APP_USR-`).
   Al ser un usuario de prueba, esas credenciales operan en sandbox.
4. Al pagar, usa el **email del usuario COMPRADOR de prueba** y una tarjeta de prueba de Colombia
   (titular `APRO` = aprobado, `OTHE` = rechazado).

## 3. Puesta en marcha
```bash
docker compose up -d

cd backend
cp .env.example .env        # completa MP_ACCESS_TOKEN, ADMIN_PASSWORD, JWT_ACCESS_SECRET, etc.
npm install
npx prisma migrate dev
npx prisma db seed          # crea admin + planes Básico/Pro (y sus preapproval_plan en MP)
npm run start:dev           # http://localhost:3000/api

cd ../frontend
cp .env.example .env        # completa VITE_MP_PUBLIC_KEY
npm install
npm run dev                 # http://localhost:5173 (proxy /api → :3000)
```
Si ejecutaste el seed sin `MP_ACCESS_TOKEN`, entra como admin → *Admin › Planes › Sincronizar MP*.

### Seguridad
- Postgres solo escucha en `127.0.0.1` (no es accesible desde la red local).
- Límites de peticiones (`@nestjs/throttler`): 120/min por IP en general; login 5/min, registro 10/hora y
  alta de suscripción 5 cada 10 min (por IP y por usuario). Al superarlos la API responde `429`.
- Cabeceras de seguridad con `helmet` (CSP, HSTS, nosniff, sin `X-Powered-By`).
- Con `NODE_ENV=production` la API **no arranca** si `JWT_ACCESS_SECRET` es el de ejemplo o mide menos de 32
  caracteres, si falta `MP_WEBHOOK_SECRET` o `MP_ACCESS_TOKEN`, o si `FRONTEND_URL` no usa https. Swagger queda
  desactivado por defecto en producción.
- El seed exige `ADMIN_PASSWORD` (sin valor por defecto; 12+ caracteres en producción).
- Detrás de un proxy o CDN define `TRUST_PROXY` para que el rate limit use la IP real del cliente.

## 4. Webhooks en local
```bash
ngrok http 3000
```
En la app de MP → *Webhooks*: URL `https://<id>.ngrok-free.app/api/webhooks/mercadopago`,
eventos **Planes y suscripciones** y **Pagos**. Copia la *clave secreta* en `MP_WEBHOOK_SECRET`.
Sin webhooks puedes usar el botón **Sincronizar** del panel (consulta el estado en MP).

## 5. Documentación de la API (Swagger)
Con el backend corriendo:
- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api/docs-json (importable en Postman, Insomnia o generadores de clientes)

Para probar endpoints protegidos: ejecuta `POST /api/auth/login`, copia el `accessToken`, pulsa **Authorize** y pégalo.
Se desactiva con `SWAGGER_ENABLED=false` (recomendado en producción).

Los esquemas de respuesta están en `backend/src/common/api.schema.ts`; los DTOs de entrada se documentan con
`@ApiProperty` y el plugin de Swagger del Nest CLI (`nest-cli.json`).

## 6. Endpoints
| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/refresh` · `/logout` | público / cookie |
| GET | `/api/auth/me` | usuario |
| GET | `/api/plans` · `/api/plans/:id` | público |
| GET/POST/PATCH/DELETE | `/api/admin/plans[/:id]`, POST `/api/admin/plans/:id/sync-mp` | admin |
| POST | `/api/subscriptions` `{ planId, cardTokenId, payerEmail }` | usuario |
| GET | `/api/subscriptions/me` · `/api/subscriptions/me/payments` | usuario |
| POST | `/api/subscriptions/:id/pause` · `/resume` · `/cancel` · `/sync` | dueño / admin |
| POST | `/api/webhooks/mercadopago` | firma `x-signature` |
| GET | `/api/admin/subscriptions` · `/api/admin/payments` · `/api/admin/stats` | admin |
| GET | `/api/content/premium` | suscripción activa |

## 7. Tests
```bash
cd backend && npm test      # verificación de firma de webhooks
```
