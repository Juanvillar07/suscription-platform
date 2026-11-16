import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Límites de peticiones (rate limiting).
 * - Global: 120 peticiones/minuto por IP (ThrottlerGuard registrado como APP_GUARD).
 * - Overrides por endpoint sensibles para frenar fuerza bruta y "card testing".
 * ttl en milisegundos.
 */
export const RATE_LIMITS = {
  global: { limit: 120, ttl: 60_000 },
  /** Login: 5 intentos por minuto por IP → frena la adivinación de contraseñas */
  login: { default: { limit: 5, ttl: 60_000 } },
  /** Registro: 10 cuentas por hora por IP */
  register: { default: { limit: 10, ttl: 3_600_000 } },
  /** Refresh: 30 por minuto por IP (varias pestañas abiertas) */
  refresh: { default: { limit: 30, ttl: 60_000 } },
  /** Alta de suscripción: 5 intentos cada 10 minutos, por IP y por usuario → frena el card testing */
  subscribe: { default: { limit: 5, ttl: 600_000 } },
} as const;

export const THROTTLE_MESSAGE = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';

/**
 * Igual que ThrottlerGuard, pero cuenta por usuario autenticado en vez de por IP.
 * Debe ejecutarse DESPUÉS de JwtAuthGuard (como guard de método) para que exista req.user.
 * Así un atacante no evita el límite cambiando de IP con la misma cuenta.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }
}
