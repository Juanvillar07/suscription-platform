import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth, ApiErrors } from '../common/api-docs.decorators';
import { PremiumContentResponse } from '../common/api.schema';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ActiveSubscriptionGuard, JwtAuthGuard } from '../common/guards';

/** Ejemplo de recurso protegido: solo usuarios con suscripción AUTHORIZED */
@ApiTags('Contenido')
@ApiAuth()
@Controller('content')
@UseGuards(JwtAuthGuard, ActiveSubscriptionGuard)
export class ContentController {
  @Get('premium')
  @ApiOperation({
    summary: 'Contenido premium',
    description: 'Ejemplo de recurso protegido con `ActiveSubscriptionGuard`: requiere una suscripción AUTHORIZED (los ADMIN siempre pasan).',
  })
  @ApiOkResponse({ type: PremiumContentResponse })
  @ApiErrors([403, 'Necesitas una suscripción activa'])
  premium(@CurrentUser() user: AuthUser) {
    return {
      title: 'Contenido premium',
      message: `Hola ${user.email}, gracias por tu suscripción.`,
      items: [
        { id: 1, title: 'Guía avanzada', description: 'Material exclusivo para suscriptores.' },
        { id: 2, title: 'Webinar mensual', description: 'Acceso a la grabación completa.' },
        { id: 3, title: 'Plantillas', description: 'Descarga recursos listos para usar.' },
      ],
    };
  }
}
