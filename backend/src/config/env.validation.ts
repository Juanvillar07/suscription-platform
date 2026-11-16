const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'FRONTEND_URL'] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((k) => !config[k]);
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')} (ver backend/.env.example)`);
  }
  if (!config.MP_ACCESS_TOKEN) {
    console.warn('[config] MP_ACCESS_TOKEN vacío: las llamadas a Mercado Pago fallarán.');
  }
  if (!config.MP_WEBHOOK_SECRET) {
    console.warn('[config] MP_WEBHOOK_SECRET vacío: los webhooks se aceptarán sin validar firma.');
  }
  return {
    ...config,
    PORT: Number(config.PORT ?? 3000),
    REFRESH_TOKEN_TTL_DAYS: Number(config.REFRESH_TOKEN_TTL_DAYS ?? 7),
  };
}
