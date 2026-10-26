# Rockit Kanban Board

## To Do

### [FRIENDS] Mejorar UI/UX de la página de friends

- tags: [frontend, friends, ui, ux]
- priority: high
- workload: Normal
    ```md
    Mejorar el diseño general de la página de friends y eliminar el aspecto "vibecodeado".
    ```

### [PLAYER] Tiempos reales de la barra de reproducción

- tags: [frontend, player, playback, bug]
- priority: high
- workload: Normal
    ```md
    Fixear los tiempos de la barra de reproducción para que sean los reales. Revisar si vienen de videoclips. Cuidado con no romper las lyrics.
    ```

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

### [TRANSITIONS] Quitar silencio inicial/final con transiciones activas

- tags: [frontend, transitions, player, audio, kb-13]
- priority: medium
- workload: Hard
    ```md
    Quitar el silencio final/inicial de las canciones cuando las transiciones están activadas. Cuidado con esto.

    Pendiente: detectar límites de audio con FFmpeg y guardar posiciones de entrada/salida sin modificar el archivo ni el reloj original de lyrics. El crossfade configurable no elimina silencios por sí solo.
    ```

### [LIBRARY] Drag & drop de canciones a listas

- tags: [frontend, library, playlists, drag-drop, ui]
- priority: medium
- workload: Normal
    ```md
    Al pinchar y arrastrar canciones en la library hacia las listas, mostrar un "+" y permitir añadirlas.
    ```

## In Progress

### [SETTINGS] Subida de imagen de perfil y avatar por defecto

- tags: [frontend, settings, profile, bug, kb-01]
- priority: high
- workload: Normal
    ```md
    Avance: el avatar de sesión ya se muestra y el fallback utiliza el recurso local. La subida sigue pendiente: falta implementar la ruta de backend para persistirla.

    Hacer funcional la subida de imagen de perfil y corregir el avatar default, que ahora mismo no se ve bien en la página de settings (parece que apunta mal).
    ```



### [BUG] Botón play/pause incorrecto al cambiar de canción con transiciones en iOS

- tags: [frontend, player, ios, transitions, bug]
- priority: high
- workload: Easy
    ```md
    Cuando las transiciones están activas en iOS y pasa a la siguiente canción, la canción suena pero el botón muestra play en vez de pause, como si tuviese que reproducirse pero ya está sonando. Cuidado con no romper lo que ya funciona.
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

### [LIBRARY] Centrar botón library y arreglar random

- tags: [frontend, library, queue, bug, ui, kb-06]
- priority: high
- workload: Normal
- steps:
    - [x] Centrar verticalmente el botón de library
    - [x] Revisar el random de la library: solo coge canciones sueltas y las coloca en una posición random de la queue
    ```md
    Centrado reforzado con grid y sin padding ni baseline de texto. Verificado en Chromium: iconos play y pause con desplazamiento vertical de 0 px dentro del círculo. Random implementado: se resuelven álbumes y playlists antes de seleccionar la primera canción aleatoria, para que no salga siempre del grupo de canciones sueltas. La reproducción ordenada conserva el arranque progresivo. Las acciones sobre otra cola cancelan la carga pendiente. Pendiente de revisión integrada; sin tests locales.

    Arreglar el botón de library centrándolo verticalmente y revisar el comportamiento del random de la library. Actualmente solo pilla canciones sueltas y las pone en una posición random de la queue.
    ```


### [FEATURED] Mostrar artista en featured lists de álbumes

- tags: [frontend, featured, albums, ui, kb-31]
- priority: medium
- workload: Easy
    ```md
    Implementado: el subtítulo de álbumes destacados incluye los artistas del álbum en los cuatro proveedores, sin peticiones adicionales desde el frontend. Los álbumes homónimos de artistas diferentes no se agrupan juntos. También se corrige el enlace pista/álbum de Rockit en estadísticas. Pendiente de revisión integrada; sin tests locales.

    Fixear en las featured lists: en los álbumes, poner también el artista.
    ```


### [FRIENDS] Estado online de la gente en tiempo real por WebSocket

- tags: [frontend, backend, friends, websocket, realtime, kb-30]
- priority: high
- workload: Normal
    ```md
    Implementado: el servidor avisa por WebSocket a los amigos aceptados al conectar la primera sesión o desconectar la última. Friends refresca su lista ante el aviso y al reconectar; las respuestas obsoletas no reemplazan el estado actual. Sin polling periódico. Pendiente de validación integrada, sin tests locales por indicación del usuario.

    Actualizar el estado de friends, el contador de gente online y el estado de cada persona por WebSocket para que se actualice en tiempo real.
    ```



### [PWA] Mejorar UI de radios en PWA iOS

- tags: [frontend, pwa, ios, ui, kb-29]
- priority: medium
- workload: Normal
    ```md
    Implementado en el buscador de emisoras: texto de 16 px para evitar zoom de foco en iPhone, apariencia consistente, foco visible y botón de borrar propio sin duplicado nativo de Safari. Teclado de búsqueda sin autocorrección ni mayúsculas automáticas. Pendiente de revisión en PWA iPhone, sin tests locales.

    Mejorar el aspecto de los inputs radio en la PWA de iOS.
    ```

### [UI] Mejorar blur del header y hacerlo más curvo

- tags: [frontend, ui, header, blur, kb-28]
- priority: medium
- workload: Easy
    ```md
    Implementado: blur con máscara elíptica, caída prolongada, esquinas inferiores curvas y tinte suave. No intercepta los controles; incluye fallback opaco para transparencia reducida. Pendiente de revisión visual, sin ejecutar tests locales.

    Mejorar el blur del header haciéndolo más curvo y con mejor acabado.
    ```

### [PLAYER] Animar el vinilo en la dirección de la cola

- tags: [frontend, player, vinyl, animation, kb-27]
- priority: medium
- workload: Normal
    ```md
    Implementado en PlayerUI, móvil y PiP: entrada/salida simultáneas según navegación. Los saltos directos usan posiciones visibles de la cola, con dirección explícita al avanzar/retroceder y al terminar la pista. Se eliminan las líneas decorativas durante el cambio. Verificados en Chromium ambos sentidos, conservación del disco, cambios rápidos y movimiento reducido al abrir. TypeScript web/shared, ESLint y comprobaciones focalizadas de cola, vinilo, transiciones e iOS correctos. Pendiente de revisión integrada.

    Al avanzar, el siguiente vinilo entra desde abajo y el anterior sale hacia arriba. Al retroceder, el anterior entra desde arriba y el actual sale hacia abajo. Aplicar en PlayerUI, móvil y PiP; contemplar saltos directos, cola aleatoria y vuelta al inicio/final. Respetar movimiento reducido y la conservación del disco para el mismo álbum/carátula.
    ```

### [SETTINGS] Popup de confirmación al guardar ajustes

- tags: [frontend, settings, feedback, ui, kb-26]
- priority: medium
- workload: Easy
    ```md
    Implementado: confirmación de éxito con check en los ajustes de descargas y transiciones. El idioma conserva su aviso existente. Las transiciones solo confirman guardado si localStorage lo permite; si falla, se avisa de que el cambio solo se aplica a esta sesión. Sin avisos al montar ni con duración inválida o sin cambios. Los campos de perfil/contraseña sin persistencia siguen pendientes, sin confirmar guardados ficticios.

    Hacer un popup cada vez que se hayan guardado los settings, con un check, para dar feedback al usuario.
    ```

### [SEARCH] Reproducir canciones ya descargadas

- tags: [frontend, search, playback, ui, kb-25]
- priority: medium
- workload: Easy
    ```md
    Añadir play en Search cuando una canción ya está descargada.

    Implementado: botón accesible sobre la carátula (play/pause para la canción actual) y acción Reproducir en el menú. Se carga la canción existente por publicId sin iniciar otra descarga; errores con feedback y bloqueo durante la carga. Pendiente de revisión integrada.
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

### [TRANSITIONS] Tiempo de transición personalizado

- tags: [frontend, transitions, settings, ui, kb-04]
- priority: medium
- workload: Normal
    ```md
    Implementado: campo numérico desde 0.1 s, sin el límite anterior de 3.5 s; admite, por ejemplo, 5 o 6 segundos. El motor respeta la duración configurada sin sustituirla por presets adaptativos. El cruce se limita a la mitad de cada pista y requiere audio precargado suficiente. Pendiente de revisión visual y de audio.

    Permitir configurar las transiciones con un tiempo custom en lugar de usar presets de una lista desplegable.
    ```

### [HOME] Añadir context menu a las canciones del home

- tags: [frontend, home, songs, context-menu, ui, kb-20]
- priority: medium
- workload: Normal
    ```md
    Implementado en canciones recientes; las selecciones rápidas ya lo tenían. Pendiente de revisión visual en web/PWA.

    Añadir un context menu a las canciones del home.
    ```

### [LIBRARY] Fixear cover de la radio

- tags: [frontend, library, radio, bug, ui, kb-18]
- priority: medium
- workload: Easy
    ```md
    Implementado: la cover sigue los cambios de imagen y las radios usan su fallback local tanto en tarjetas como en filas. Los fallbacks de otras tarjetas respetan su tipo. Pendiente de revisión visual con radios reales.

    Fixear la cover de la radio en la library.
    ```

### [PWA] Masonry móvil desalineado en iOS

- tags: [frontend, pwa, ios, mobile, layout, bug, kb-19]
- priority: medium
- workload: Easy
    ```md
    Implementado: tarjetas inline-block de ancho completo, alineadas arriba y sin fragmentación entre columnas. Pendiente de validación en Safari/PWA iPhone.

    En el masonry móvil de dos columnas, la segunda columna empieza un poco desplazada hacia abajo y queda desalineada con la columna de la izquierda en la web móvil PWA de iOS.
    ```

### [PLAYER] Añadir modo vinilo en web móvil

- tags: [frontend, player, mobile, ui, kb-14]
- priority: medium
- workload: Normal
    ```md
    Implementado: selector táctil carátula/vinilo para canciones, preferencia compartida con desktop y giro según reproducción. Respeta movimiento reducido. Cambio y retorno a carátula comprobados en Chromium a 390×844. Pendiente de validación en iPhone.

    Añadir el modo vinilo a la versión web móvil.
    ```

### [FRIENDS] Arreglar contador de personas online

- tags: [frontend, friends, bug, kb-08]
- priority: medium
- workload: Easy
    ```md
    Alcance aclarado: el header muestra el total global de usuarios conectados; Friends muestra el estado online de los amigos en tiempo real (KB-30).

    Implementado: sustituido el 1263 fijo del header por el recuento de usuarios únicos recibido por WebSocket. Varias pestañas/dispositivos de la misma persona cuentan una vez; se descuenta al cerrar la última conexión. Al perder conexión, el header muestra un guion en vez de un número obsoleto. Los contadores de Friends siguen friendsAtom. Pendiente de revisión integrada, sin tests locales.
    ```

### [PIP] Distintos tamaños de picture-in-picture y modo vinilo

- tags: [frontend, pip, player, vinyl, ui, kb-24]
- priority: medium
- workload: Normal
    ```md
    Implementado: layouts adaptativos, textos largos truncados, controles y menú dentro del viewport, vídeo desde videoUrl y modo vinilo. Las bandas libres alrededor del contenido usan el fondo del PiP, sin recuadro negro. Verificados 118 casos únicos en 28 tamaños con componentes reales y estado de prueba (incluidos 11 minis altos/alargados), además de apertura/cierre de Document PiP real. Nueva revisión: barra horizontal en una fila, botón de letra visible, letra integrada sin tapar controles y línea actual en minis. Verificados 18 casos focalizados en seis tamaños con carátula y ambas orientaciones de vídeo. Último ajuste: carátulas y vídeos redondeados; fondo, letra activa, slider y estados de los controles derivados de dominantColor. Verificados 15 casos en cinco tamaños y seis estados de paleta. Pruebas repetibles: pnpm test:pip. Detalles y límites en docs/pip-responsive-review.md. Pendiente de revisión integrada.

    Mejorar el picture-in-picture para tener distintos tamaños como hace Spotify y añadir también el modo vinilo ahí.
    ```

## Done
