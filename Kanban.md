# Rockit Kanban Board

## To Do

### [LYRICS] Mejorar detección y asignación de lyrics

- tags: [frontend, backend, lyrics, matching]
- priority: high
- workload: Normal
    ```md
    Mejorar la detección o assignment de las lyrics a las canciones para que se detecte mejor la canción que se está reproduciendo.
    ```

### [DOWNLOADS] Descargar solo música y no videoclips

- tags: [backend, downloads, spotdl, ytdlp]
- priority: medium
- workload: Normal
    ```md
    Intentar que spotdl o yt-dlp descargue solo música que no sean videoclips. Ajustar la búsqueda.
    ```

### [LIBRARY] Drag & drop de canciones a listas

- tags: [frontend, library, playlists, drag-drop, ui]
- priority: medium
- workload: Normal
    ```md
    Al pinchar y arrastrar canciones en la library hacia las listas, mostrar un "+" y permitir añadirlas.
    ```

## In Progress


### [PLAYER] Tiempos reales de la barra de reproducción

- tags: [frontend, player, playback, bug]
- priority: high
- workload: Normal
    ```md
    Fixear los tiempos de la barra de reproducción para que sean los reales. Revisar si vienen de videoclips. Cuidado con no romper las lyrics.
    ```

## Idle

### [LIBRARY] Investigar tiempo de carga

- tags: [frontend, library, performance, kb-07]
- priority: medium
- workload: Easy
- steps:
    - [ ] Confirmar con Ignacio si la library tarda un segundo en cargar
    ```md
    Aparcada por indicación de Ignacio. No investigar ni modificar por ahora.
    ```

## To Review

### [SEARCH] Reproducir canciones ya descargadas

- tags: [frontend, search, playback, ui, kb-25]
- priority: medium
- workload: Easy
- defaultExpanded: false
- steps:
    - [x] Se me abre el context menu para una cancion qe ya tengo descargada y en mi library
    ```md
    Corregida la causa en los providers: Search recibe publicId y disponibilidad reales de las canciones descargadas. SpotifyScrapper resuelve IDs exactos en una consulta por lote; YouTube Music y RockIt devuelven la identidad local. Sin coincidencias por título ni lógica específica en core.
    Clic izquierdo reproduce o pausa; clic derecho/pulsación larga mantienen el menú. Hover: carátula oscurecida con play blanco centrado que aparece con una escala breve. Foco de teclado visible, acción visible en táctil y movimiento reducido respetado. Vocabulary existente.
    Pendiente de revisión del usuario. Sin suites locales; comprobación visual en Chromium y regresión para CI.
    ```

### [BUG] Botón play/pause incorrecto al cambiar de canción con transiciones en iOS

- tags: [frontend, player, ios, transitions, bug, kb-32]
- priority: high
- workload: Easy
    ```md
    Implementado: los eventos pause/playing se contrastan con el estado actual del elemento, para ignorar eventos retrasados durante el cambio de pistas. La resolución de play() reconcilia el icono solo para el elemento y playbackId activos, manteniendo las comprobaciones de propiedad de reproducción. Pendiente de validación en iPhone con transiciones; sin tests locales.

    Cuando las transiciones están activas en iOS y pasa a la siguiente canción, la canción suena pero el botón muestra play en vez de pause, como si tuviese que reproducirse pero ya está sonando. Cuidado con no romper lo que ya funciona.
    ```

### [PWA] Mejorar UI de radios en PWA iOS

- tags: [frontend, pwa, ios, ui, kb-29]
- priority: medium
- workload: Normal
    ```md
    Implementado en el buscador de emisoras: texto de 16 px para evitar zoom de foco en iPhone, apariencia consistente, foco visible y botón de borrar propio sin duplicado nativo de Safari. Teclado de búsqueda sin autocorrección ni mayúsculas automáticas. Pendiente de revisión en PWA iPhone, sin tests locales.

    Mejorar el aspecto de los inputs radio en la PWA de iOS.
    ```

## Done

### [LIBRARY] Centrar botón library y arreglar random

- tags: [frontend, library, queue, bug, ui, kb-06]
- priority: high
- workload: Normal
- defaultExpanded: false
- steps:
    - [x] Centrar verticalmente el botón de library
    - [x] Revisar el random de la library: solo coge canciones sueltas y las coloca en una posición random de la queue
    - [x] Random sigue siendo raro empeza muy abajo en la cola en vez de empezar en el principio, i que aparece ezclado pero random en la cola, deberis ser que la cola se ordene de una manera distinta cada vez que s ele de al play y empezar por la primera cancion
    ```md
    Revisión: Random resuelve toda la biblioteca, mezcla las pistas reproducibles y arranca en la primera posición visible de la cola; elimina la segunda selección aleatoria que saltaba a mitad de lista. Cada nueva reproducción reconstruye la mezcla. Reproducción ordenada progresiva conservada. Pendiente de revisión; sin tests locales.

    Centrado reforzado con grid y sin padding ni baseline de texto. Verificado en Chromium: iconos play y pause con desplazamiento vertical de 0 px dentro del círculo. Random implementado: se resuelven álbumes y playlists antes de seleccionar la primera canción aleatoria, para que no salga siempre del grupo de canciones sueltas. La reproducción ordenada conserva el arranque progresivo. Las acciones sobre otra cola cancelan la carga pendiente. Pendiente de revisión integrada; sin tests locales.

    Arreglar el botón de library centrándolo verticalmente y revisar el comportamiento del random de la library. Actualmente solo pilla canciones sueltas y las pone en una posición random de la queue.
    ```

### [HOME] Añadir context menu a las canciones del home

- tags: [frontend, home, songs, context-menu, ui, kb-20]
- priority: medium
- workload: Normal
- defaultExpanded: false
- steps:
    - [x] Flata las del carrousel y las de froyou player discover recently played hiddeg gems y asi solo estan las de quick selections hechas
    ```md
    Revisión: menú contextual añadido al carrusel y a todas las tarjetas Bento (Para ti, recientes, joyas ocultas y demás listas del Home). Descubrimientos mantienen acciones con URL resuelta y ofrecen búsqueda/descarga bajo demanda cuando todavía no hay URL. Clic derecho o pulsación larga; el carrusel pausa el avance automático mientras su menú está abierto y conserva la distribución móvil/desktop. Alt de portadas desde vocabulary. Pendiente de revisión visual; sin tests locales.

    Implementado en canciones recientes; las selecciones rápidas ya lo tenían. Pendiente de revisión visual en web/PWA.

    Añadir un context menu a las canciones del home.
    ```

### [TRANSITIONS] Quitar silencio inicial/final con transiciones activas

- tags: [frontend, transitions, player, audio, kb-13]
- priority: medium
- workload: Hard
    ```md
    KB-13 / PR144: análisis acotado y cacheado de silencios en los extremos, con margen para entradas suaves. Archivos y reloj de lyrics originales. Integrado con las transiciones web y resolución de archivos en cada provider.
    Evidencias y límites: docs/audio-silence-analysis.md. Revisar las grabaciones antes de mover a Done. Validación pendiente en iPhone/PWA real y carga de producción.
    ```

### [SOCIAL] Emblemas Rockit y comparación entre amigos

- tags: [frontend, backend, friends, badges, kb-36]
- priority: medium
- workload: Normal
    ```md
    Completada por indicación de Ignacio tras la revisión de PR145 y PR146.

    Revisión con develop actualizado: vista inicial de tres familias de medallas y desglose de hitos plegable, conservando el catálogo completo de 115 y la comparación. Se mantiene el mismo reparto de columnas que Friends base para que el progreso personal no domine la página. Evidencia en docs/friends-integrated-review.md: nueve tamaños y 26 comprobaciones de interacción con datos de ejemplo; sin suites de tests locales.

    115 medallas con descripciones breves, sin etiquetas de dificultad, nueve familias (incluyen amigos, vídeos y descubrimiento + recomendaciones), filtros y búsqueda; diseños basados en el logo de Rockit, con condiciones de desbloqueo reales, colección personal y comparación de logros entre amigos. No poner comparación antes que la actividad social en móvil.
    ```

### [SOCIAL] XP por tiempo real de escucha y sesiones

- tags: [backend, friends, xp, kb-35]
- priority: medium
- workload: Hard
    ```md
    Completada por indicación de Ignacio tras la revisión de PR145 y PR146.

    Aprobado: hitos de sesión a 10, 20, 30 y 60 minutos de escucha real; excluir pausas, seeks y dispositivos duplicados. Conservar XP anterior, premios idempotentes y progreso persistente. Importes iniciales ajustables por política. PR separado del rediseño de Friends.
    ```

### [FRIENDS] Vocabulary desde el Excel

- tags: [frontend, i18n, vocabulary, kb-34]
- priority: medium
- workload: Easy
    ```md
    Completada por indicación de Ignacio tras la revisión de PR145 y PR146.

    Etiquetas de Friends y De/Para localizados en Vocabulary.xlsx (en/es/fr), tipos y fallback generados desde el Excel; generación sin escrituras de BD. Auditadas las referencias de vocabulario de Friends. Revisado y aprobado por Ignacio. Sin tests locales.
    ```

### [FRIENDS] Mejorar UI/UX de la página de friends

- tags: [frontend, friends, ui, ux, kb-33]
- priority: high
- workload: Normal
    ```md
    Completada por indicación de Ignacio tras la revisión de PR145 y PR146.

    Revisión tras integrar develop: columnas principales de igual anchura; compartidos muestra 3 filas y recientes 4, con expansión accesible. Se evita que la columna central y los listados completos dominen la página. Conjunto revisado con XP/medallas en nueve tamaños, con capturas y mediciones en docs/friends-integrated-review.md; sin suites de tests locales.

    Rama separada: feat/friends-listening-space. Propuesta con música y personas primero, actividad sin tarjetas repetidas, directorio con búsqueda e invitaciones, vistas de escucha conjunta/compartidos y rankings bajo demanda. Revisión de pantallas grandes: ancho disponible completo, actividad en paralelo y columna de sesiones/compartidos en ultrawide, mediante container queries. Diseño revisado y aprobado por Ignacio. Sin tests locales.

    Mejorar el diseño general de la página de friends y eliminar el aspecto "vibecodeado".
    ```

### [UI] Mejorar blur del header y hacerlo más curvo

- tags: [frontend, ui, header, blur, kb-28]
- priority: medium
- workload: Easy
    ```md
    Revisado y aprobado por el usuario: blur progresivo con tinte negro del 10 %. Tarea completada.

    Revisión de legibilidad y coste: tres franjas recortadas de blur progresivo (dos, limitadas a 4 px, desde 1920 px de viewport), tinte negro ligero del 10 % para conservar translucidez y geometría que sigue la altura real del header. Los ratios de 4,97:1 corresponden al tinte anterior del 72 %, no a esta variante translúcida; foco visible, targets de 44 px y estados aclarados. Corregido desbordamiento a 768 px; revisados 768/1024/1440/3440 px y texto al 200 % a 1440 px. Transparencia reducida y contraste aumentado usan fondo opaco sin filtros. Copy desde vocabulary, incluidas traducciones LOG_IN es/fr. Scroll ultrawide mediano: 88,5 ms antes frente a 20,9 ms con la variante adaptativa en Chromium sin GPU; no garantiza 60 fps en hardware real. Detalles en docs/header-blur-review.md. Safari sigue sin validación específica; revisión visual aprobada por el usuario, sin tests locales.

    Implementado: blur con máscara elíptica, caída prolongada, esquinas inferiores curvas y tinte suave. No intercepta los controles; incluye fallback opaco para transparencia reducida. Pendiente de revisión visual, sin ejecutar tests locales.

    Mejorar el blur del header haciéndolo más curvo y con mejor acabado.
    ```

### [SETTINGS] Subida de imagen de perfil y avatar por defecto

- tags: [frontend, settings, profile, bug, kb-01]
- priority: high
- workload: Normal
    ```md
    Implementado: selector accesible en móvil/teclado, subida autenticada de JPG/PNG/WebP de hasta 5 MB, validación del contenido y dimensiones en servidor, orientación EXIF y conversión a avatar WebP de 512×512 sin metadatos originales. Se guarda la imagen del usuario y se actualiza el avatar de sesión con feedback de guardado/error. Fallback local para imágenes fallidas. Pendiente de revisión integrada, sin tests locales.

    Hacer funcional la subida de imagen de perfil y corregir el avatar default, que ahora mismo no se ve bien en la página de settings (parece que apunta mal).
    ```

### [FEATURED] Mostrar artista en featured lists de álbumes

- tags: [frontend, featured, albums, ui, kb-31]
- priority: medium
- workload: Easy
    ```md
    Implementado: el subtítulo de álbumes destacados incluye los artistas del álbum en los cuatro proveedores, sin peticiones adicionales desde el frontend. Los álbumes homónimos de artistas diferentes no se agrupan juntos. También se corrige el enlace pista/álbum de Rockit en estadísticas. Pendiente de revisión integrada; sin tests locales.

    Fixear en las featured lists: en los álbumes, poner también el artista.
    ```

### [PIP] Distintos tamaños de picture-in-picture y modo vinilo

- tags: [frontend, pip, player, vinyl, ui, kb-24]
- priority: medium
- workload: Normal
    ```md
    Implementado: layouts adaptativos, textos largos truncados, controles y menú dentro del viewport, vídeo desde videoUrl y modo vinilo. Las bandas libres alrededor del contenido usan el fondo del PiP, sin recuadro negro. Verificados 118 casos únicos en 28 tamaños con componentes reales y estado de prueba (incluidos 11 minis altos/alargados), además de apertura/cierre de Document PiP real. Nueva revisión: barra horizontal en una fila, botón de letra visible, letra integrada sin tapar controles y línea actual en minis. Verificados 18 casos focalizados en seis tamaños con carátula y ambas orientaciones de vídeo. Último ajuste: carátulas y vídeos redondeados; fondo, letra activa, slider y estados de los controles derivados de dominantColor. Verificados 15 casos en cinco tamaños y seis estados de paleta. Pruebas repetibles: pnpm test:pip. Detalles y límites en docs/pip-responsive-review.md. Pendiente de revisión integrada.

    Mejorar el picture-in-picture para tener distintos tamaños como hace Spotify y añadir también el modo vinilo ahí.
    ```

### [FRIENDS] Arreglar contador de personas online

- tags: [frontend, friends, bug, kb-08]
- priority: medium
- workload: Easy
    ```md
    Alcance aclarado: el header muestra el total global de usuarios conectados; Friends muestra el estado online de los amigos en tiempo real (KB-30).

    Implementado: sustituido el 1263 fijo del header por el recuento de usuarios únicos recibido por WebSocket. Varias pestañas/dispositivos de la misma persona cuentan una vez; se descuenta al cerrar la última conexión. Al perder conexión, el header muestra un guion en vez de un número obsoleto. Los contadores de Friends siguen friendsAtom. Pendiente de revisión integrada, sin tests locales.
    ```

### [PLAYER] Añadir modo vinilo en web móvil

- tags: [frontend, player, mobile, ui, kb-14]
- priority: medium
- workload: Normal
    ```md
    Implementado: selector táctil carátula/vinilo para canciones, preferencia compartida con desktop y giro según reproducción. Respeta movimiento reducido. Cambio y retorno a carátula comprobados en Chromium a 390×844. Ajuste de revisión: el modo vinilo elimina el fondo y la sombra rectangular del contenedor móvil. Pendiente de validación en iPhone.

    Añadir el modo vinilo a la versión web móvil.
    ```

### [PWA] Masonry móvil desalineado en iOS

- tags: [frontend, pwa, ios, mobile, layout, bug, kb-19]
- priority: medium
- workload: Easy
    ```md
    Implementado: tarjetas inline-block de ancho completo, alineadas arriba y sin fragmentación entre columnas. Pendiente de validación en Safari/PWA iPhone.

    En el masonry móvil de dos columnas, la segunda columna empieza un poco desplazada hacia abajo y queda desalineada con la columna de la izquierda en la web móvil PWA de iOS.
    ```

### [LIBRARY] Fixear cover de la radio

- tags: [frontend, library, radio, bug, ui, kb-18]
- priority: medium
- workload: Easy
    ```md
    Implementado: la cover sigue los cambios de imagen y las radios usan su fallback local tanto en tarjetas como en filas. Los fallbacks de otras tarjetas respetan su tipo. Pendiente de revisión visual con radios reales.

    Fixear la cover de la radio en la library.
    ```

### [TRANSITIONS] Tiempo de transición personalizado

- tags: [frontend, transitions, settings, ui, kb-04]
- priority: medium
- workload: Normal
    ```md
    Implementado: campo numérico desde 0.1 s, sin el límite anterior de 3.5 s; admite, por ejemplo, 5 o 6 segundos. El motor respeta la duración configurada sin sustituirla por presets adaptativos. El cruce se limita a la mitad de cada pista y requiere audio precargado suficiente. Pendiente de revisión visual y de audio.

    Permitir configurar las transiciones con un tiempo custom en lugar de usar presets de una lista desplegable.
    ```

### [PLAYER] Pantalla vertical: dividir el PlayerUI por la mitad

- tags: [frontend, player, mobile, layout, kb-03]
- priority: medium
- workload: Normal
- steps:
    - [x] Validar la implementación actual con Ignacio
    - [x] Dividir el PlayerUI por la mitad en pantalla vertical
    ```md
    Validado: en pantalla vertical (p. ej. 1080×1920), dividir el área disponible en dos mitades iguales. Arriba, vídeo o carátula ajustados a la celda manteniendo su proporción; abajo, lyrics y queue.

    Implementado. Pendiente de revisión visual en pantalla vertical.
    ```

### [SETTINGS] Popup de confirmación al guardar ajustes

- tags: [frontend, settings, feedback, ui, kb-26]
- priority: medium
- workload: Easy
    ```md
    Implementado: confirmación de éxito con check en los ajustes de descargas y transiciones. El idioma conserva su aviso existente. Las transiciones solo confirman guardado si localStorage lo permite; si falla, se avisa de que el cambio solo se aplica a esta sesión. Sin avisos al montar ni con duración inválida o sin cambios. Los campos de perfil/contraseña sin persistencia siguen pendientes, sin confirmar guardados ficticios.

    Hacer un popup cada vez que se hayan guardado los settings, con un check, para dar feedback al usuario.
    ```

### [FRIENDS] Estado online de la gente en tiempo real por WebSocket

- tags: [frontend, backend, friends, websocket, realtime, kb-30]
- priority: high
- workload: Normal
    ```md
    Implementado: el servidor avisa por WebSocket a los amigos aceptados al conectar la primera sesión o desconectar la última. Friends refresca su lista ante el aviso y al reconectar; las respuestas obsoletas no reemplazan el estado actual. Sin polling periódico. Pendiente de validación integrada, sin tests locales por indicación del usuario.

    Actualizar el estado de friends, el contador de gente online y el estado de cada persona por WebSocket para que se actualice en tiempo real.
    ```

### [PLAYER] Animar el vinilo en la dirección de la cola

- tags: [frontend, player, vinyl, animation, kb-27]
- priority: medium
- workload: Normal
    ```md
    Implementado en PlayerUI, móvil y PiP: entrada/salida simultáneas según navegación. Los saltos directos usan posiciones visibles de la cola, con dirección explícita al avanzar/retroceder y al terminar la pista. Se eliminan las líneas decorativas durante el cambio. Verificados en Chromium ambos sentidos, conservación del disco, cambios rápidos y movimiento reducido al abrir. TypeScript web/shared, ESLint y comprobaciones focalizadas de cola, vinilo, transiciones e iOS correctos. Pendiente de revisión integrada.

    Al avanzar, el siguiente vinilo entra desde abajo y el anterior sale hacia arriba. Al retroceder, el anterior entra desde arriba y el actual sale hacia abajo. Aplicar en PlayerUI, móvil y PiP; contemplar saltos directos, cola aleatoria y vuelta al inicio/final. Respetar movimiento reducido y la conservación del disco para el mismo álbum/carátula.
    ```
