import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FrequencyType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Anual', maxLength: 60 })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 'anual', pattern: '^[a-z0-9-]+$', description: 'Identificador único en minúsculas' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug solo admite minúsculas, números y guiones' })
  slug: string;

  @ApiPropertyOptional({ example: 'Un año completo con descuento.', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ type: [String], example: ['Todo lo del plan Pro', '2 meses gratis'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Precio en COP (entero)', example: 399000, minimum: 1000 })
  @IsInt()
  @Min(1000)
  price: number;

  @ApiProperty({ description: 'Cada cuántas unidades de frequencyType se cobra', example: 12, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  frequency: number;

  @ApiProperty({ enum: FrequencyType, enumName: 'FrequencyType', example: FrequencyType.MONTHS })
  @IsEnum(FrequencyType)
  frequencyType: FrequencyType;

  @ApiPropertyOptional({ description: 'Días de prueba gratis antes del primer cobro', example: 7, minimum: 1, maximum: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  freeTrialDays?: number;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @ApiPropertyOptional({ example: false, description: 'false oculta el plan de la página de precios' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
