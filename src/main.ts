import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { arrancarModulo, conexionUnicaModulo } from './bootstrap-modulo';
import { CommonModule } from './common/common.module';
import { crearControladorSaludModulo } from './health/salud-modulo';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { FichaV2Module } from './modules/catalogo/v2/ficha-v2.module';
import { ComunDominioModule } from './modules/comun/comun.module';
import { DisponibilidadPuertosHttpModule } from './modules/disponibilidad/disponibilidad.puerto';
import { ReservasPuertosHttpModule } from './modules/reservas/admin/reservas-vigentes.http';

const SaludCatalogoController = crearControladorSaludModulo('catalogo');

// Proceso separado del módulo catalogo (fase 9.2): conecta solo como cozy_catalogo y registra únicamente [Alojamiento, Ciudad, Habitacion].
// Consulta disponibilidad y reservas mediante los adaptadores HTTP de sus puertos (D1). FichaV2Module va al final.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    conexionUnicaModulo('catalogo'),
    CommonModule,
    ComunDominioModule,
    ReservasPuertosHttpModule,
    DisponibilidadPuertosHttpModule,
    CatalogoModule,
    FichaV2Module,
  ],
  controllers: [SaludCatalogoController],
})
export class CatalogoAppModule {}

if (require.main === module) {
  void arrancarModulo({
    modulo: 'catalogo',
    puertoPorDefecto: 3002,
    variablePuerto: 'PORT_CATALOGO',
    AppModulo: CatalogoAppModule,
  });
}

