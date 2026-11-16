import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BEARER } from '../swagger';
import { ErrorResponse } from './api.schema';

const DEFAULT_DESCRIPTIONS: Record<number, string> = {
  400: 'Datos inválidos o Mercado Pago rechazó la operación',
  401: 'Falta el accessToken o expiró',
  403: 'No tienes permisos para este recurso',
  404: 'Recurso no encontrado',
  409: 'Conflicto con el estado actual',
  502: 'Mercado Pago no respondió correctamente',
};

/** Documenta respuestas de error con el formato estándar `{ statusCode, message, error }` */
export function ApiErrors(...codes: (number | [number, string])[]) {
  return applyDecorators(
    ...codes.map((c) => {
      const [status, description] = Array.isArray(c) ? c : [c, DEFAULT_DESCRIPTIONS[c]];
      return ApiResponse({ status, description, type: ErrorResponse });
    }),
  );
}

/** Endpoint que requiere `Authorization: Bearer <accessToken>` */
export function ApiAuth() {
  return applyDecorators(ApiBearerAuth(BEARER), ApiErrors(401));
}
