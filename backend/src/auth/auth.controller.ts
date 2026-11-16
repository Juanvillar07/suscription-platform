import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RATE_LIMITS } from '../common/throttling';
import { ApiAuth, ApiErrors } from '../common/api-docs.decorators';
import { AuthResponse, MeResponse } from '../common/api.schema';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { REFRESH_COOKIE as REFRESH_COOKIE_AUTH } from '../swagger';
import { AuthService, IssuedTokens } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

const REFRESH_COOKIE = 'refresh_token';
const SET_COOKIE_NOTE =
  'Además deja el refresh token en la cookie httpOnly `refresh_token` (path `/api/auth`, SameSite=Lax).';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle(RATE_LIMITS.register)
  @ApiOperation({ summary: 'Crear cuenta', description: `Registra un usuario con rol USER e inicia sesión. ${SET_COOKIE_NOTE}` })
  @ApiCreatedResponse({ type: AuthResponse })
  @ApiErrors(400, [409, 'El email ya está registrado'], [429, 'Más de 10 registros por hora desde la misma IP'])
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto);
    return { user, accessToken: this.setRefreshCookie(res, tokens) };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(RATE_LIMITS.login)
  @ApiOperation({ summary: 'Iniciar sesión', description: `Devuelve el usuario y un accessToken. ${SET_COOKIE_NOTE}` })
  @ApiOkResponse({ type: AuthResponse })
  @ApiErrors(400, [401, 'Credenciales inválidas'], [429, 'Más de 5 intentos por minuto desde la misma IP'])
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto);
    return { user, accessToken: this.setRefreshCookie(res, tokens) };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(RATE_LIMITS.refresh)
  @ApiCookieAuth(REFRESH_COOKIE_AUTH)
  @ApiOperation({
    summary: 'Renovar el accessToken',
    description:
      'Lee la cookie `refresh_token`, la revoca y emite una nueva (rotación). Si se reutiliza un refresh token ya revocado se cierran todas las sesiones del usuario.',
  })
  @ApiOkResponse({ type: AuthResponse })
  @ApiErrors([401, 'Sin refresh token, expirado o revocado'], 429)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { user, tokens } = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
      return { user, accessToken: this.setRefreshCookie(res, tokens) };
    } catch (e) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth(REFRESH_COOKIE_AUTH)
  @ApiOperation({ summary: 'Cerrar sesión', description: 'Revoca el refresh token de la cookie y la elimina.' })
  @ApiNoContentResponse({ description: 'Sesión cerrada' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiAuth()
  @ApiOperation({ summary: 'Usuario actual', description: 'Datos del usuario y resumen de su suscripción abierta.' })
  @ApiOkResponse({ type: MeResponse })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private setRefreshCookie(res: Response, tokens: IssuedTokens) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/api/auth',
      expires: tokens.refreshExpiresAt,
    });
    return tokens.accessToken;
  }
}
