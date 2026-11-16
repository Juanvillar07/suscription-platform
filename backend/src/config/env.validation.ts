const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'FRONTEND_URL'] as const;

/** Valores de ejemplo de .env.example: nunca deben llegar a producción */
const PLACEHOLDER_SECRETS = new Set(['cambia-esto-por-un-secreto-largo', 'changeme', 'secret']);
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Valida la configuración al arrancar.
 * En producción (NODE_ENV=production) los valores inseguros detienen el arranque;
 * en desarrollo solo se avisa para no bloquear el trabajo local.
 */
export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')} (ver backend/.env.example)`);
  }

  const isProd = config.NODE_ENV === 'production';
  const problems: string[] = [];

  const jwtSecret = String(config.JWT_ACCESS_SECRET);
  if (PLACEHOLDER_SECRETS.has(jwtSecret) || jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(
      `JWT_ACCESS_SECRET debe ser aleatorio y de al menos ${MIN_JWT_SECRET_LENGTH} caracteres (genera uno con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")`,
    );
  }
  if (!config.MP_ACCESS_TOKEN) {
    problems.push('MP_ACCESS_TOKEN vacío: las llamadas a Mercado Pago fallarán');
  }
  if (!config.MP_WEBHOOK_SECRET) {
    problems.push('MP_WEBHOOK_SECRET vacío: los webhooks se aceptan sin validar la firma');
  }
  if (isProd && !String(config.FRONTEND_URL).startsWith('https://')) {
    problems.push('FRONTEND_URL debe usar https en producción');
  }

  if (problems.length) {
    if (isProd) {
      throw new Error(`Configuración insegura para producción:\n- ${problems.join('\n- ')}`);
    }
    for (const p of problems) console.warn(`[config] ${p}`);
  }

  return {
    ...config,
    PORT: Number(config.PORT ?? 3000),
    REFRESH_TOKEN_TTL_DAYS: Number(config.REFRESH_TOKEN_TTL_DAYS ?? 7),
    // Swagger: activo por defecto solo fuera de producción (SWAGGER_ENABLED=true/false lo fuerza)
    SWAGGER_ENABLED: config.SWAGGER_ENABLED !== undefined ? config.SWAGGER_ENABLED === 'true' : !isProd,
    // Número de proxies de confianza delante de la app (para obtener la IP real del cliente)
    TRUST_PROXY: Number(config.TRUST_PROXY ?? 0),
  };
}
