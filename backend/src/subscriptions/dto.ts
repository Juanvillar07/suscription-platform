import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ format: 'uuid', example: '5f5735d3-a800-43ec-84cd-dadc0c39c597' })
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'Token de tarjeta generado en el frontend con los campos seguros de Mercado Pago (`createCardToken`). Es de un solo uso.',
    example: 'ff8080814c11e237014c1ff593b57b4d',
  })
  @IsString()
  @IsNotEmpty()
  cardTokenId: string;

  @ApiProperty({
    description: 'Email de la cuenta de Mercado Pago que paga. Debe ser del mismo país que el vendedor (Colombia). En sandbox: el usuario comprador de prueba.',
    example: 'test_user_123456789@testuser.com',
  })
  @IsEmail()
  payerEmail: string;
}
