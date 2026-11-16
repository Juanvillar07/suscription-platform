import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiAuth, ApiErrors } from '../common/api-docs.decorators';
import { PlanResponse } from '../common/api.schema';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { PlansService } from './plans.service';

const PlanIdParam = () => ApiParam({ name: 'id', format: 'uuid', description: 'id del plan' });

@ApiTags('Planes')
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar planes activos', description: 'Planes visibles en la página de precios, ordenados por precio.' })
  @ApiOkResponse({ type: [PlanResponse] })
  findActive() {
    return this.plans.findActive();
  }

  @Get(':id')
  @PlanIdParam()
  @ApiOperation({ summary: 'Detalle de un plan' })
  @ApiOkResponse({ type: PlanResponse })
  @ApiErrors([400, 'El id no es un UUID'], 404)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.findOne(id);
  }
}

@ApiTags('Admin · Planes')
@ApiAuth()
@ApiErrors([403, 'Requiere rol ADMIN'])
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los planes', description: 'Incluye los inactivos.' })
  @ApiOkResponse({ type: [PlanResponse] })
  findAll() {
    return this.plans.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Crear plan',
    description: 'Crea el plan en la base de datos y su `preapproval_plan` en Mercado Pago (`POST /preapproval_plan`).',
  })
  @ApiCreatedResponse({ type: PlanResponse })
  @ApiErrors(400, [409, 'Ya existe un plan con ese slug'], 502)
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @Patch(':id')
  @PlanIdParam()
  @ApiOperation({
    summary: 'Actualizar plan',
    description: 'Si cambian nombre, precio o frecuencia también se actualiza el `preapproval_plan` en Mercado Pago.',
  })
  @ApiOkResponse({ type: PlanResponse })
  @ApiErrors(400, 404, 502)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  @Delete(':id')
  @PlanIdParam()
  @ApiOperation({ summary: 'Desactivar plan', description: 'No lo borra: marca `isActive=false`. Las suscripciones existentes siguen activas.' })
  @ApiOkResponse({ type: PlanResponse })
  @ApiErrors(404)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.deactivate(id);
  }

  @Post(':id/sync-mp')
  @PlanIdParam()
  @ApiOperation({
    summary: 'Sincronizar con Mercado Pago',
    description: 'Crea el `preapproval_plan` si el plan aún no lo tiene (p. ej. si el seed se ejecutó sin MP_ACCESS_TOKEN). Idempotente.',
  })
  @ApiCreatedResponse({ type: PlanResponse })
  @ApiErrors(404, 502)
  sync(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.syncWithMercadoPago(id);
  }
}
