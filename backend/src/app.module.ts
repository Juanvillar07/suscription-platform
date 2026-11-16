import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMITS, THROTTLE_MESSAGE } from './common/throttling';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { HttpLoggerMiddleware } from './common/http-logger.middleware';
import { validateEnv } from './config/env.validation';
import { ContentModule } from './content/content.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ...RATE_LIMITS.global }],
      errorMessage: THROTTLE_MESSAGE,
    }),
    PrismaModule,
    MercadoPagoModule,
    UsersModule,
    AuthModule,
    PlansModule,
    PaymentsModule,
    SubscriptionsModule,
    WebhooksModule,
    AdminModule,
    ContentModule,
  ],
  // Límite global por IP en todas las rutas (los endpoints sensibles lo endurecen con @Throttle)
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('{*splat}'); // todas las rutas (sintaxis de Nest 11)
  }
}
