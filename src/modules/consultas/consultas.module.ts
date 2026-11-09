import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { DisponibilidadModule } from '../disponibilidad/disponibilidad.module';
import { ReservasModule } from '../reservas/reservas.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MantenimientoV2Service } from './mantenimiento-v2.service';
import { StockOutboxAdminController } from './stock-outbox-admin.controller';

// Fase 9.2 (§2 del diseño): las rutas de búsqueda, detalles y fichas pasaron a catálogo y las de órdenes v1 a reservas.
// ConsultasModule conserva en el monolito el mantenimiento y estado del panel (StockOutboxAdminController).
@Module({
  imports: [CommonModule, UsuariosModule, CatalogoModule, DisponibilidadModule, ReservasModule],
  controllers: [StockOutboxAdminController],
  providers: [MantenimientoV2Service],
})
export class ConsultasModule {}
