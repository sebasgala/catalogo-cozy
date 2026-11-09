# Microservicio de Catálogo (`catalogo-cozy`)

Microservicio de gestión de alojamientos, ciudades, habitaciones, búsqueda y detalles de catálogo de Cozy.

## Características
- **Fichas y Catálogo:** Alojamientos, ciudades, habitaciones, facilidades, fotos y políticas.
- **Búsqueda y Disponibilidad Agregada:** Búsqueda REST v1 y v2 para Booking.
- **Contrato de Puerto:** Expone `catalogo-puerto` (`contracts/catalogo-puerto-openapi.yaml`) vía REST interno para disponibilidad y reservas.
- **Consumo de Dependencias:** Llama a `disponibilidad` y `reservas` vía adaptadores HTTP internos.
- **Base de datos:** Conexión exclusiva con rol `cozy_catalogo` sobre el esquema `catalogo` de `cozy_v2`.
- **Salud:** `GET /health` en el puerto 3002.

## Instalación y compilación
```bash
npm ci
npm run build
```
