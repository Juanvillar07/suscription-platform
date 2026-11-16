import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Detrás de un proxy/CDN: confiar en N saltos para que req.ip (rate limit, logs) sea la IP real
  const trustProxy = config.get<number>('TRUST_PROXY') ?? 0;
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  // Cabeceras de seguridad. La API solo devuelve JSON: CSP sin recursos externos.
  // Swagger UI necesita estilos inline e imágenes data:, así que usa una CSP propia algo más amplia.
  const apiHelmet = helmet();
  const docsHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith('/api/docs') ? docsHelmet(req, res, next) : apiHelmet(req, res, next),
  );

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  // Activo por defecto fuera de producción; SWAGGER_ENABLED=true/false lo fuerza (ver env.validation.ts)
  const swaggerEnabled = config.get<boolean>('SWAGGER_ENABLED') === true;
  if (swaggerEnabled) setupSwagger(app);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`API escuchando en http://localhost:${port}/api`, 'Bootstrap');
  if (swaggerEnabled) Logger.log(`Documentación Swagger en http://localhost:${port}/api/docs`, 'Bootstrap');
}
void bootstrap();
