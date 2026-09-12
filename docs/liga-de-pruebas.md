# Liga actual en modo de pruebas

Aplicar `supabase/migrations/202609120001_manual_practice.sql` a la base de datos del proyecto antes de usar los controles. Esta entrega no aplica migraciones ni activa el modo en la base remota.

1. Entrar como administrador en **Administración → Liga de pruebas**.
2. Seleccionar una jornada sin finalizar o crear una nueva desde el mismo panel.
3. Activar el modo de pruebas, elegir qué acciones se permiten y guardar.
4. Abrir o cerrar mercado, alineaciones y envío de puntos por separado. En este modo se ignoran los plazos de alineación y las esperas temporales de cláusulas. Los resultados completos no cierran la jornada.
5. Generar una ronda de ofertas cuando se necesite. Las ofertas permanecen aunque cambie la semana. **Cerrar y adjudicar pujas** realiza los fichajes, descuenta el saldo y registra las transacciones. Las ofertas se procesan por su orden; gana la mayor puja con saldo y plaza, y los empates se resuelven por antigüedad. Repetir la adjudicación no duplica fichajes. Generar otra ronda abandona las pujas pendientes de la anterior.
6. En **Jornadas y cálculo**, revisar y finalizar la jornada para calcular puntos, recompensas y precios. Los botones de abrir y bloquear también actualizan los controles de la jornada seleccionada. Para otra prueba tras finalizar, crear otra jornada.
7. Desactivar el modo y guardar para volver al calendario habitual.

Se utiliza la liga actual: dinero, plantillas, puntos e historial se conservan. Salir del modo de pruebas no restaura los datos anteriores. La web muestra un aviso mientras el modo está activo.

## Verificación

Las pruebas de `tests/practice.test.ts` ejecutan las migraciones de esquema en PostgreSQL local (PGlite), con usuarios y datos desechables. Comprueban autorización, fechas vencidas, cierres independientes, ausencia de cierre automático, mercado congelado, adjudicación y finalización repetidas, y vuelta a los plazos normales. Excluyen las antiguas migraciones de datos demo; las incorporaciones históricas de valores enum se confirman antes de su uso, como exige PostgreSQL.

La compilación y la suite general pasan. El lint global presenta errores previos de `no-explicit-any` en `src/app/leagues/page.tsx`. No se ha probado el panel con una sesión de administrador en la base remota.
