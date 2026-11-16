import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://x',
  FRONTEND_URL: 'https://app.example.com',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  MP_ACCESS_TOKEN: 'APP_USR-x',
  MP_WEBHOOK_SECRET: 'whsec',
};

describe('validateEnv', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('acepta una configuración de producción segura', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).not.toThrow();
  });

  it('en producción rechaza el JWT_ACCESS_SECRET de ejemplo', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'cambia-esto-por-un-secreto-largo' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('en producción exige MP_WEBHOOK_SECRET', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', MP_WEBHOOK_SECRET: '' })).toThrow(/MP_WEBHOOK_SECRET/);
  });

  it('en producción exige FRONTEND_URL con https', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', FRONTEND_URL: 'http://app.example.com' })).toThrow(/https/);
  });

  it('en desarrollo solo avisa', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'corto', MP_WEBHOOK_SECRET: '' })).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });

  it('Swagger se desactiva por defecto en producción y se activa en desarrollo', () => {
    expect(validateEnv({ ...base, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
    expect(validateEnv({ ...base }).SWAGGER_ENABLED).toBe(true);
    expect(validateEnv({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
  });
});
