# Player: ajuste para monitores verticales

## Alcance

Se mantiene la composición existente: tres columnas en horizontal y ultrawide,
portada/vídeo arriba y lyrics/cola abajo en vertical, y panel con pestañas en las
proporciones intermedias. El player móvil tiene sus propios componentes.

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
