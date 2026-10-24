# Player: ajuste para monitores verticales

## Alcance

Se mantiene la composición existente: tres columnas en horizontal y ultrawide,
portada/vídeo arriba y lyrics/cola abajo en vertical, y panel con pestañas en las
proporciones intermedias. El player móvil tiene sus propios componentes.

### Ajuste posterior: ancho completo en vertical

En vertical, la primera fila toma la altura natural de la portada cuadrada o del
vídeo. Se retiran el padding lateral y las esquinas redondeadas de esa superficie:
la portada y un vídeo 16:9 llegan a los dos extremos del área del player. Lyrics
y cola conservan su padding y ocupan la altura restante. La navegación lateral
continúa fuera de ese área. Las composiciones horizontales no cambian.

Los vídeos muy altos conservan un límite de altura para que los paneles inferiores
sigan accesibles; llenar todo el ancho con un vídeo 9:16 no siempre es compatible
con ese requisito y con mantener su proporción.

Se revisaron 19 tamaños, desde 769×1200 hasta 5120×1440, incluyendo 4K horizontal
y vertical. Portada, vinilo, radio y un MP4 real 1280×720 sumaron 76 casos sin
desbordamientos ni errores JavaScript. Las portadas mantuvieron 1:1 y el vídeo
16:9 siguió reproduciéndose al cambiar de composición, sin desmontarse. Se
generaron 77 capturas para revisión visual, incluyendo un caso adicional 9:16.
Son previsualizaciones con datos y barras de prueba, no capturas de producción.

La corrección afecta únicamente a `PlayerUI/Content.tsx` y `PlayerUI/Main.tsx`.
No modifica reproducción, peticiones, cola, descargas ni almacenamiento de audio.

## Causas y corrección

- La portada y la radio utilizaban `cqh` dentro de un contenedor `inline-size`.
  Ese contenedor no permite consultar su alto: `cqh` recurre al viewport y la
  imagen puede superar su fila. Se usa `container-type: size` para consultar
  ambos ejes del bloque disponible. El margen del 96% se aplica ahora al bloque,
  también en horizontal; puede reducir ligeramente la portada respecto a antes.
- Las filas verticales usan `minmax(0, 1fr)` para permitir que sus contenidos
  reduzcan tamaño sin imponer mínimos intrínsecos.
- El marco del vídeo forzaba ancho y alto simultáneamente, y la variable con la
  proporción nativa se guardaba en un descendiente que el marco no podía leer.
  Ahora la proporción se guarda en el propio marco y determina su altura. El
  ancho se limita tanto por el ancho disponible como por el 90% del alto del
  bloque multiplicado por esa proporción. Se conserva `object-contain`.
- Los listeners de metadatos y cambio de dimensiones del vídeo se retiran al
  desacoplarlo, evitando acumular callbacks al cambiar de medio o modo.

Un vídeo ancho aprovecha todo el ancho cuando cabe en altura; un vídeo vertical
necesita márgenes laterales cuando llenarlo a lo ancho excedería la fila.

## Comprobación visual local

Se preparó una previsualización temporal con los componentes reales PlayerUI,
Content, Main, Lyrics, Queue y Vinyl, React y CSS compilado por Tailwind. Datos,
HTTP y managers se sustituyeron por fixtures; no se accedió a producción.

En Chromium se compararon antes/después con estas 11 resoluciones:
1080×1920, 917×1500, 900×1600, 1440×2560, 1920×1080, 2560×1440,
3440×1440, 1280×1024, 820×1180, 769×1200 y 1280×600.

Por resolución se revisaron nueve estados: canción con lyrics, vinilo, radio,
vídeo 16:9, 4:3, 9:16 y 21:9, vídeo en modo audio y canción sin lyrics.
Las proporciones de esta matriz se simularon mediante metadatos del elemento
video. Las 99 combinaciones posteriores no mostraron desbordamiento del marco
respecto al bloque asignado ni errores JavaScript.

Ejemplo en 1080×1920: antes la portada medía 1016×1016 dentro de una fila de
832 px y se superponía al panel inferior. Después mide aproximadamente 799×799.
Un vídeo 16:9 ocupa 1016×572, dentro de esa misma fila.

Además se generaron dos MP4 temporales, 640×480 y 360×640, y se reprodujeron en
1080×1920, 1920×1080 y 3440×1440. Los seis casos conservaron la proporción
nativa, continuaron reproduciéndose y no registraron errores del vídeo. El
mismo elemento video permaneció montado al cambiar entre composiciones.

No se ejecutó la suite local de tests, por indicación del usuario. El navegador
utilizó fixtures y no valida el flujo completo de la aplicación autenticada.
Queda pendiente una comprobación en Safari/iPhone físico; sus componentes de
player móvil no se han modificado.
