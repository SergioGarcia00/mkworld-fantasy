# MKWorld Fantasy · Sistema de diseño

Identidad nueva: mesa de competición Atlas League, superficies sólidas negro azulado, marcadores blancos y señalización azul. Experiencia pública primero. No se importa CSS ni componentes visuales de la aplicación anterior.

## Tokens
Fondo #080d16; superficie #101a28; superficie elevada #172437; borde #29374b; texto #f4f8ff; secundario #a9b8cc; acción #4798ff; hielo #a9ddff; cierre/carrera #ff777f. El rojo se reserva a cierre y carrera. Errores con texto e icono.

## Tipografía
Barlow Condensed Bold autoalojada para titulares (32, 40, 64, máximo 80px); Barlow Regular autoalojada para contenido (16px/1.5); etiquetas 12px y datos 16–24px, cifras tabulares. Titulares sin degradados. Licencia OFL incluida en public/fonts.

## Geometría y espaciado
Barra lateral 232px; cabecera 80px; contenido máximo 1500px; espaciado 4,8,12,16,24,32,48,64px. Controles radio 6px, paneles 12px. Sombras solo para diálogos: 0 24px 80px #0008. Superficies separadas por líneas, sin cristal decorativo.

## Componentes antes de pantallas
Shell: navegación persistente y cabecera de jornada. Navigation: enlace activo azul, aria-current, menú desplegable móvil. PageHeading: título y descripción. EmptyState: icono lineal, explicación y siguiente acción. Timeline: ciclo semanal en Madrid. PlayerTable: cabecera semántica y enlaces a perfil; filtros con etiquetas, paginación. Popup: dialog nativo modal, foco contenido, Escape y cerrar. Badge: texto explícito para cada estado.

Botón primario azul con texto oscuro; secundario sólido con borde. Altura mínima 44px. Hover sube contraste sin desplazar; foco 2px hielo separado 3px; disabled reduce opacidad y mantiene explicación. Formularios con label, ayuda y mensajes aria-live; no depender del placeholder. Tablas alinean números a la derecha, no cortan nombres. Paneles vacíos conservan la acción útil. Carga textual accesible y skeleton estático; error con reintento, sin datos técnicos. Respeta prefers-reduced-motion.

## Móvil
Hasta 900px la navegación pasa a menú desplegable; hero y contenido se apilan. Hasta 600px métricas en 2 columnas, tabla con desplazamiento local y nombre visible. Sin desbordamiento del documento. Diálogo ocupa ancho disponible, con altura limitada y scroll propio.

## Cabecera de vista general
Composición compacta en dos columnas: mensaje y acceso a pilotos a la izquierda; agenda semanal con cuatro filas a la derecha. La firma tipográfica de Atlas League cierra el mensaje. Titular de 38–52px y horarios de 13–16px. Por debajo de 740px se apilan en el orden de lectura. El calendario conserva sus contenidos compartidos con el reglamento. No incluye trazado de circuito ni etiquetas flotantes.
