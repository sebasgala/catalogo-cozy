import { Controller, Get, HttpCode, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '../usuarios/usuarios.contrato';
import { ProblemDetailsFilter } from '../comun/problems/problem-details.filter';
import { respuestaProblema } from '../comun/problems/respuestas-swagger';
import { JwtAuthGuard } from '../usuarios/seguridad/jwt-auth.guard';
import { Roles } from '../usuarios/seguridad/roles.decorator';
import { RolesGuard } from '../usuarios/seguridad/roles.guard';
import { MantenimientoV2Service } from './mantenimiento-v2.service';
import { DisponibilidadPuerto } from '../disponibilidad/disponibilidad.puerto';

class UltimoErrorDto {
  @ApiProperty() mensaje: string;
  @ApiProperty({ format: 'date' }) fecha: string;
  @ApiProperty({ type: 'integer' }) intentos: number;
}

class EnvioDto {
  @ApiProperty({ description: 'false = BOOKING_GRPC_URL no está definida y el aviso de stock está apagado' }) activo: boolean;
  @ApiProperty({ nullable: true, example: 'localhost:50051' }) destino: string | null;
  @ApiProperty({ nullable: true }) tls: boolean | null;
  @ApiProperty({ nullable: true, example: 'alojamientos' }) serviceId: string | null;
  @ApiProperty({ nullable: true, description: 'Último fallo de envío del proceso (null si el último envío salió bien)' }) ultimoError: string | null;
}

class EstadoOutboxDto {
  @ApiProperty({ type: () => EnvioDto }) envio: EnvioDto;
  @ApiProperty({ type: 'integer', description: 'Avisos de stock por enviar' }) pendientes: number;
  @ApiProperty({ type: 'integer' }) enviados: number;
  @ApiProperty({ type: 'integer', description: 'Booking los rechazó (ITEM_NOT_FOUND, INVALID_SLOT): no se reintentan' }) rechazados: number;
  @ApiProperty({ type: 'integer', description: 'Pendientes que ya fallaron al menos una vez' }) pendientesConFallos: number;
  @ApiProperty({ type: 'integer' }) intentosMaximos: number;
  @ApiProperty({ type: 'integer', nullable: true, description: 'Antigüedad en segundos del aviso pendiente más viejo' }) pendienteMasAntiguaSegundos: number | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) ultimoEnvioEn: string | null;
  @ApiProperty({ type: () => UltimoErrorDto, nullable: true }) ultimoError: UltimoErrorDto | null;
  @ApiProperty({ type: 'integer', description: 'Último `sequence` publicado en el feed de eventos' }) ultimoSequenceEvento: number;
  @ApiProperty({ type: 'integer', description: 'Eventos ya confirmados en las outbox de los dominios que el publicador todavía no copió al feed (normalmente 0: publica cada 200 ms)' })
  eventosPendientes: number;
}

class LimpiezaDto {
  @ApiProperty({ type: 'integer' }) outboxStock: number;
  @ApiProperty({ type: 'integer' }) idempotencia: number;
  @ApiProperty({ type: 'integer' }) cotizaciones: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de la outbox de stock (aviso a Booking por gRPC) y limpieza de lo vencido. Solo superadmin.
// NO es parte del contrato.
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Interno - Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.SUPERADMIN)
@UseFilters(ProblemDetailsFilter)
@Controller('admin/stock-outbox')
export class StockOutboxAdminController {
  constructor(
    private readonly mantenimiento: MantenimientoV2Service,
    private readonly disponibilidad: DisponibilidadPuerto,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Estado del aviso de stock a Booking', description: 'Cuántos avisos esperan, cuántos fallaron, el último error, el último sequence del feed de eventos y cuántos eventos esperan al publicador.' })
  @ApiResponse({ status: 200, description: 'Estado de la outbox', type: EstadoOutboxDto })
  @ApiResponse(respuestaProblema(403, 'Solo el superadmin'))
  async estado() {
    return { envio: this.disponibilidad.estadoEnvio(), ...(await this.mantenimiento.estadoOutbox()) };
  }

  @Post('limpiar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Borrar lo vencido de la v2',
    description: 'Avisos de stock enviados o rechazados hace más de 7 días, claves de idempotencia vencidas (24 h) y cotizaciones vencidas que ninguna orden usó. Los avisos pendientes y el feed de eventos no se tocan.',
  })
  @ApiResponse({ status: 200, description: 'Filas borradas por tabla', type: LimpiezaDto })
  @ApiResponse(respuestaProblema(403, 'Solo el superadmin'))
  limpiar() {
    return this.mantenimiento.limpiar();
  }
}
