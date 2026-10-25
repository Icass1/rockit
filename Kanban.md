# Rockit Kanban Board

## To Do


### [FRIENDS] Mejorar UI/UX de la página de friends

- tags: [frontend, friends, ui, ux]
- priority: high
- workload: Normal
    ```md
    Mejorar el diseño general de la página de friends y eliminar el aspecto "vibecodeado".
    ```


### [PWA] Revisar transiciones en PWA iOS (iPhone)

- tags: [frontend, pwa, ios, transitions]
- priority: high
- workload: Normal
    ```md
    Revisar y corregir las transiciones de la PWA en iOS/iPhone.
    ```


### [PWA] Mejorar UI de radios en PWA iOS

- tags: [frontend, pwa, ios, ui]
- priority: medium
- workload: Normal
    ```md
    Mejorar el aspecto de los inputs radio en la PWA de iOS.
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

### [PLAYER] Añadir modo vinilo en web móvil

- tags: [frontend, player, mobile, ui]
- priority: medium
- workload: Normal
    ```md
    Añadir el modo vinilo a la versión web móvil.
    ```

### [BUG] Botón play/pause incorrecto al cambiar de canción con transiciones en iOS

- tags: [frontend, player, ios, transitions, bug]
- priority: high
- workload: Easy
    ```md
    Cuando las transiciones están activas en iOS y pasa a la siguiente canción, la canción suena pero el botón muestra play en vez de pause, como si tuviese que reproducirse pero ya está sonando. Cuidado con no romper lo que ya funciona.
    ```

### [FEATURED] Mostrar artista en featured lists de álbumes

- tags: [frontend, featured, albums, ui]
- priority: medium
- workload: Easy
    ```md
    Fixear en las featured lists: en los álbumes, poner también el artista.
    ```

### [FRIENDS] Estado online de la gente en tiempo real por WebSocket

- tags: [frontend, backend, friends, websocket, realtime]
- priority: high
- workload: Normal
    ```md
    Actualizar el estado de friends, el contador de gente online y el estado de cada persona por WebSocket para que se actualice en tiempo real.
    ```

### [LIBRARY] Fixear cover de la radio

- tags: [frontend, library, radio, bug, ui]
- priority: medium
- workload: Easy
    ```md
    Fixear la cover de la radio en la library.
    ```

### [PWA] Masonry móvil desalineado en iOS

- tags: [frontend, pwa, ios, mobile, layout, bug]
- priority: medium
- workload: Easy
    ```md
    En el masonry móvil de dos columnas, la segunda columna empieza un poco desplazada hacia abajo y queda desalineada con la columna de la izquierda en la web móvil PWA de iOS.
    ```


### [SETTINGS] Popup de confirmación al guardar ajustes

- tags: [frontend, settings, feedback, ui]
- priority: medium
- workload: Easy
    ```md
    Hacer un popup cada vez que se hayan guardado los settings, con un check, para dar feedback al usuario.
    ```

### [LIBRARY] Drag & drop de canciones a listas

- tags: [frontend, library, playlists, drag-drop, ui]
- priority: medium
- workload: Normal
    ```md
    Al pinchar y arrastrar canciones en la library hacia las listas, mostrar un "+" y permitir añadirlas.
    ```

### [UI] Mejorar blur del header y hacerlo más curvo

- tags: [frontend, ui, header, blur]
- priority: medium
- workload: Easy
    ```md
    Mejorar el blur del header haciéndolo más curvo y con mejor acabado.
    ```

### [PIP] Distintos tamaños de picture-in-picture y modo vinilo

- tags: [frontend, pip, player, vinyl, ui]
- priority: medium
- workload: Normal
    ```md
    Mejorar el picture-in-picture para tener distintos tamaños como hace Spotify y añadir también el modo vinilo ahí.
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


### [FRIENDS] Arreglar contador de personas online

- tags: [frontend, friends, bug, kb-08]
- priority: medium
- workload: Easy
    ```md
    Avance: el banner cuenta todos los amigos online, aunque solo muestre hasta 10 avatares. Falta verificar su integración en la página de friends y la actualización en tiempo real.

    Poner bien el contador de personas online en la página de friends.
    ```

### [LIBRARY] Centrar botón library y arreglar random

- tags: [frontend, library, queue, bug, ui, kb-06]
- priority: high
- workload: Normal
- steps:
    - [x] Centrar verticalmente el botón de library
    - [ ] Revisar el random de la library: solo coge canciones sueltas y las coloca en una posición random de la queue
    ```md
    Centrado reforzado con grid y sin padding ni baseline de texto. Verificado en Chromium: iconos play y pause con desplazamiento vertical de 0 px dentro del círculo. La revisión de random sigue pendiente.

    Arreglar el botón de library centrándolo verticalmente y revisar el comportamiento del random de la library. Actualmente solo pilla canciones sueltas y las pone en una posición random de la queue.
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

## Done
