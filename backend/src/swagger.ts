import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const BEARER = 'access-token';
export const REFRESH_COOKIE = 'refresh_token';

const description = `
API de la plataforma de suscripciones con **Mercado Pago (Colombia, COP)**.

### Autenticación
1. \`POST /api/auth/login\` (o \`/register\`) devuelve un **accessToken** (JWT, 15 min) y deja el
   **refresh token** en la cookie httpOnly \`refresh_token\` (path \`/api/auth\`).
2. Pulsa **Authorize** y pega el accessToken para probar los endpoints protegidos.
3. \`POST /api/auth/refresh\` rota el refresh token y entrega un accessToken nuevo.

### Flujo de suscripción
1. El frontend tokeniza la tarjeta con los campos seguros de Mercado Pago (\`cardTokenId\`).
2. \`POST /api/subscriptions\` crea el \`preapproval\` en Mercado Pago asociado al \`preapproval_plan\` del plan.
3. Mercado Pago cobra cada periodo y notifica a \`POST /api/webhooks/mercadopago\`.
4. El backend consulta siempre el recurso real en la API de Mercado Pago y actualiza suscripción y pagos.

### Errores
Todas las respuestas de error siguen el formato estándar de NestJS: \`{ statusCode, message, error }\`.
Los errores que vienen de Mercado Pago se devuelven como \`400\`/\`502\` con \`message: "Mercado Pago: ..."\`
(el detalle completo queda solo en los logs del servidor).

### Límites de peticiones
Global: 120 peticiones/minuto por IP. Login: 5/min. Registro: 10/hora. Alta de suscripción: 5 cada 10 min
por IP y por usuario. Al superarlos se responde \`429\`.

### Montos
Todos los montos están en **pesos colombianos (COP)**, como enteros sin decimales.
`;

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('SubsPlatform API')
    .setDescription(description)
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'accessToken de /auth/login' }, BEARER)
    .addCookieAuth(REFRESH_COOKIE, { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE })
    .addTag('Auth', 'Registro, inicio de sesión y renovación de tokens')
    .addTag('Planes', 'Catálogo público de planes')
    .addTag('Suscripciones', 'Alta y gestión de la suscripción del usuario')
    .addTag('Contenido', 'Recursos protegidos por suscripción activa')
    .addTag('Webhooks', 'Notificaciones entrantes de Mercado Pago')
    .addTag('Admin · Planes', 'Gestión de planes y sincronización con Mercado Pago (rol ADMIN)')
    .addTag('Admin · Reportes', 'Suscripciones, pagos y métricas (rol ADMIN)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'SubsPlatform API · Docs',
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });
}
