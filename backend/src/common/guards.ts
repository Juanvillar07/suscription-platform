import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, ROLES_KEY } from './decorators';

/** Exige un access token válido (Authorization: Bearer ...) */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Usar junto a JwtAuthGuard + @Roles(Role.ADMIN) */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para este recurso');
    }
    return true;
  }
}

/** Usar junto a JwtAuthGuard: exige una suscripción AUTHORIZED */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    const active = await this.prisma.subscription.findFirst({
      where: { userId: user.id, status: SubscriptionStatus.AUTHORIZED },
      select: { id: true },
    });
    if (!active) throw new ForbiddenException('Necesitas una suscripción activa');
    return true;
  }
}
