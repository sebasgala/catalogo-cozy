import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventosService } from '../comun/v2/eventos.service';
import { PublicadorEventosService } from '../comun/v2/publicador-eventos.service';
import { DisponibilidadPuerto } from '../disponibilidad/disponibilidad.puerto';
import { LimpiezaReservasService } from '../reservas/v2/limpieza-reservas.service';

// Limpieza periódica de lo que la v2 va acumulando. Corre una vez por hora (y a pedido del superadmin).
// Fase 8.0: cada dominio limpia sus tablas; esto solo las llama y junta el resultado.
//   disponibilidad   outbox_stock enviada o rechazada (7 días) y cotizaciones vencidas que ninguna orden usó
//   reservas         idempotencia_v2 vencida (24 horas)
// El feed de eventos (feed_eventos) NO se limpia: Booking necesita la numeración completa.

export interface ResultadoLimpieza {
  outboxStock: number;
  idempotencia: number;
  cotizaciones: number;
}

const HORA_MS = 3_600_000;

@Injectable()
export class MantenimientoV2Service implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('MantenimientoV2');
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    private readonly disponibilidad: DisponibilidadPuerto,
    private readonly reservas: LimpiezaReservasService,
    private readonly eventos: EventosService,
    private readonly publicador: PublicadorEventosService,
  ) {}

  onModuleInit(): void {
    // Sin esto la aplicación de pruebas (V2_LIMPIEZA=false) no toca datos mientras se verifica
    if (process.env.V2_LIMPIEZA === 'false') return;
    this.temporizador = setInterval(() => void this.limpiar().catch((e) => this.log.error(`Limpieza con error: ${(e as Error).message}`)), HORA_MS);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  async limpiar(): Promise<ResultadoLimpieza> {
    const { outboxStock, cotizaciones } = await this.disponibilidad.limpiar();
    const { idempotencia } = await this.reservas.limpiar();
    const resultado: ResultadoLimpieza = { outboxStock, idempotencia, cotizaciones };
    if (outboxStock + idempotencia + cotizaciones > 0) this.log.log(`Limpieza: ${JSON.stringify(resultado)}`);
    return resultado;
  }

  // Estado de la outbox de stock para el superadmin
  async estadoOutbox() {
    return { ...(await this.disponibilidad.estadoOutbox()), ultimoSequenceEvento: await this.eventos.ultimoSequence(), eventosPendientes: await this.publicador.pendientes() };
  }
}
