-- Universo Atlas: 20 noticias editoriales, con hechos y leyendas claramente diferenciados.
with payload(title, body, category, published) as (values
  ('[CANON] Sipgb y la órbita de Piolin / Sayori', 'Sipgb se adjudicó Piolin / Sayori por 20.000 €. En el mapa de Atlas, su órbita empezó a brillar justo al cierre del mercado.', 'Universo Atlas', true),
  ('[CANON] Splendy encontró nueva constelación', 'Croqueta incorporó a Splendy por 28.000 € tras la corrección oficial del cierre. Dos estrellas, una misma trayectoria.', 'Universo Atlas', true),
  ('[CANON] Phoski mantiene el pulso estelar', 'Phoski se llevó Phoski/bwin/Stake por 20.000 €. El observatorio registra una alineación perfecta entre piloto y propietario.', 'Universo Atlas', true),
  ('[CANON] La ruta de El Graco', 'El Graco sumó a DemonShark por 6.500 €. Su constelación gana una estrella de trayectoria imprevisible.', 'Universo Atlas', true),
  ('[CANON] Zekeke / devcard cambia de cielo', 'El Graco fichó a zekeke / devcard por 19.000 €. El traspaso dibuja una nueva línea en el firmamento de Atlas.', 'Universo Atlas', true),
  ('[CANON] Morioh y el cometa del cachivache', 'Morioh ganó la puja por el cachivache con 15.000 €. El cometa ya aparece en los registros oficiales de la jornada.', 'Universo Atlas', true),
  ('[CANON] Wolfeet captura a Pan/JosePablo', 'Wolfeet se adjudicó Pan/JosePablo por 3.000 €. La señal llegó desde una órbita lejana, pero quedó anotada en el mercado.', 'Universo Atlas', true),
  ('[CANON] OscarBK y la estrella Mago', 'OscarBK incorporó a Mago por 4.505 €. Los astrónomos de Atlas lo consideran un fichaje de precisión.', 'Universo Atlas', true),
  ('[CANON] Morioh alcanza a Aizen', 'Aizen viaja ahora en la constelación de Morioh. La adjudicación quedó registrada al cierre de la jornada.', 'Universo Atlas', true),
  ('[CANON] Cano cruza la frontera de Morioh', 'Cano también encontró sitio en la plantilla de Morioh. Dos pilotos, una nueva galaxia competitiva.', 'Universo Atlas', true),
  ('[LEYENDA] La estrella fugaz de Yegu07', 'Se cuenta que Yegu07 deja una estela azul cada vez que adelanta en la última curva. Nadie ha conseguido fotografiarla.', 'Universo Atlas', true),
  ('[LEYENDA] El agujero negro de Aizen', 'Una leyenda dice que Aizen puede absorber la mala suerte de toda una parrilla antes de la salida.', 'Universo Atlas', true),
  ('[LEYENDA] El mapa secreto de Splendy', 'Los veteranos hablan de un mapa de estrellas que señala la curva perfecta para Splendy. El mapa nunca aparece dos veces en el mismo sitio.', 'Universo Atlas', true),
  ('[LEYENDA] La luna de Piolin / Sayori', 'Según el rumor, Piolin / Sayori solo corre al máximo cuando la luna queda justo encima del paddock.', 'Universo Atlas', true),
  ('[LEYENDA] Phoski y la constelación gemela', 'Dicen que existe una segunda constelación de Phoski al otro lado del cielo y que ambas compiten por la misma bandera.', 'Universo Atlas', true),
  ('[LEYENDA] El cometa de El Graco', 'Una historia de paddock asegura que El Graco llegó a una carrera siguiendo un cometa y acabó encontrando tres adelantamientos imposibles.', 'Universo Atlas', true),
  ('[LEYENDA] Morioh escucha a las estrellas', 'Las crónicas no confirmadas dicen que Morioh elige sus fichajes mirando el cielo cinco minutos antes de pujar.', 'Universo Atlas', true),
  ('[LEYENDA] La galaxia perdida de Cano', 'Cano tendría una galaxia propia, oculta detrás de la línea de meta, donde cada vuelta dura un segundo menos.', 'Universo Atlas', true),
  ('[LEYENDA] El faro de StarLax', 'Los navegantes de Atlas cuentan que StarLax sirve de faro para los pilotos que se pierden en las curvas nocturnas.', 'Universo Atlas', true),
  ('[LEYENDA] La lluvia de estrellas de la Season 3', 'Si diez pilotos cruzan la meta con la misma puntuación, la tradición dice que el cielo de Atlas se llena de estrellas durante una vuelta.', 'Universo Atlas', true)
)
insert into public.news_posts(title, body, category, published)
select p.title, p.body, p.category, p.published
from payload p
where not exists (select 1 from public.news_posts n where n.title = p.title);
