# MKWorld Fantasy — nueva aplicación

Proyecto independiente dentro de `mkworld-fantasy-nuevo`. La interfaz se ha escrito desde cero; se conserva la lógica de servidor y las migraciones existentes como base de integración. El proyecto anterior no se ha sobrescrito.

## Arranque

Desde esta carpeta:

```powershell
npm install
npm run dev -- --port 3100
```

Producción local: `npm run build` y `npm run start -- --port 3100`.

## Experiencia pública

Vista general con circuito y línea temporal; directorio de 1.965 pilotos con búsqueda, filtros y paginación; perfiles de pilotos y equipos; clasificación oficial; calendario; estadísticas; historial; reglamento; soporte; noticias y chat con popup. MMR y posiciones vienen del JSON aportado; precios, jornadas y resultados se consultan en Supabase. No se inventan precios cuando falta conexión.

`DESIGN.md` documenta colores, tipografía autoalojada, componentes, estados y diseño móvil. `PRODUCT.md` conserva las reglas del producto.

## Integración de participantes y administración

Interfaz nueva de acceso con usuario y contraseña, plantilla, mercado semanal, alineación con capitán, puntuaciones y panel de administración. Se utilizan las funciones y tablas del proyecto existente, con validación y autorización en servidor. No existe registro público.

Las escrituras con cuentas reales no se han ejecutado durante esta entrega. Requieren una cuenta habilitada y las migraciones de la base de datos. El panel administrativo requiere además las credenciales de operador ya definidas por el proyecto.

## Migraciones nuevas, preparadas pero no aplicadas remotamente

- `202609070001_participant_deadlines.sql`: cierres de mercado y alineaciones en Madrid, incluso en llamadas directas a las funciones.
- `202609070002_public_chat.sql`: lectura pública de mensajes visibles, sin exponer las cuentas.
- `202609070003_public_news.sql`: corrige el permiso de noticias para visitantes anónimos. En la base compartida actual se ha observado `permission denied for function is_admin` al leer noticias sin sesión.

Las tres se han ejecutado en una base PostgreSQL local desechable, junto con todas las migraciones anteriores. La lectura anónima de noticias conserva los borradores ocultos. La base compartida no se ha modificado.

Antes de publicar, aplicar estas migraciones al destino elegido y verificar el ciclo completo con cuentas de prueba. El cron semanal existente no se ha instalado remotamente.

## Alcance pendiente respecto al documento completo

La prioridad de esta entrega es la experiencia pública. La configuración de horarios, zona horaria y composición del mercado todavía sigue las constantes y funciones SQL del reglamento; no dispone de un editor dinámico completo. El panel presenta los envíos y permite finalizar jornadas/recalcular, pero la validación individual de envíos requiere añadir un estado individual de aprobación; el cálculo actual ya suma los envíos semanales. La auditoría utiliza transacciones y cambios de precio existentes, no un registro universal de cada edición administrativa. La tendencia de clasificación muestra «Sin comparativa» mientras no se implemente la comparación histórica acumulada.

## Verificación

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test` — 44 pruebas
- `node scripts/verify-migrations.mjs` — todas las migraciones y RLS público
- `impeccable detect src --json` — sin incidencias

Inspección en navegador a ancho de escritorio y 390px, apertura/cierre del popup, navegación móvil y búsqueda de pilotos. No hay desbordamiento horizontal del documento en la comprobación móvil; las tablas tienen desplazamiento propio.

