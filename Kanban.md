# Rockit Kanban Board

## To Do


### [SETTINGS] Subida de imagen de perfil y avatar por defecto

- tags: [frontend, settings, profile, bug]
- priority: high
- workload: Normal
    ```md
    Hacer funcional la subida de imagen de perfil y corregir el avatar default, que ahora mismo no se ve bien en la página de settings (parece que apunta mal).
    ```


### [PLAYER] Pantalla vertical: dividir el PlayerUI por la mitad

- tags: [frontend, player, mobile, layout]
- priority: medium
- workload: Normal
- steps:
    - [ ] Validar la implementación actual con Ignacio
    - [ ] Dividir el PlayerUI por la mitad en pantalla vertical
    ```md
    Pantalla vertical: dividir por la mitad el PlayerUI. Pendiente de que Ignacio valide la versión actual antes de implementar.
    ```

### [TRANSITIONS] Tiempo de transición personalizado

- tags: [frontend, transitions, settings, ui]
- priority: medium
- workload: Normal
    ```md
    Permitir configurar las transiciones con un tiempo custom en lugar de usar presets de una lista desplegable.
    ```

### [PWA] Revisar transiciones en PWA iOS (iPhone)

- tags: [frontend, pwa, ios, transitions]
- priority: high
- workload: Normal
    ```md
    Revisar y corregir las transiciones de la PWA en iOS/iPhone.
    ```

### [LIBRARY] Centrar botón library y arreglar random

- tags: [frontend, library, queue, bug, ui]
- priority: high
- workload: Normal
- steps:
    - [ ] Centrar verticalmente el botón de library
    - [ ] Revisar el random de la library: solo coge canciones sueltas y las coloca en una posición random de la queue
    ```md
    Arreglar el botón de library centrándolo verticalmente y revisar el comportamiento del random de la library. Actualmente solo pilla canciones sueltas y las pone en una posición random de la queue.
    ```

### [LIBRARY] Investigar tiempo de carga

- tags: [frontend, library, performance]
- priority: medium
- workload: Easy
- steps:
    - [ ] Confirmar con Ignacio si la library tarda un segundo en cargar
    ```md
    La library tarda un segundo en cargar? Confirmar con Ignacio antes de tocar nada.
    ```

### [FRIENDS] Arreglar contador de personas online

- tags: [frontend, friends, bug]
- priority: medium
- workload: Easy
    ```md
    Poner bien el contador de personas online en la página de friends.
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

- tags: [frontend, transitions, player, audio]
- priority: medium
- workload: Hard
    ```md
    Quitar el silencio final/inicial de las canciones cuando las transiciones están activadas. Cuidado con esto.
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

### [HOME] Añadir context menu a las canciones del home

- tags: [frontend, home, songs, context-menu, ui]
- priority: medium
- workload: Normal
    ```md
    Añadir un context menu a las canciones del home.
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


## Idle

## To Review

### [SOCIAL] Emblemas Rockit y comparación entre amigos

- tags: [frontend, backend, friends, badges, kb-36]
- priority: medium
- workload: Normal
    ```md
    Medallas originales basadas en el logo de Rockit, con condiciones de desbloqueo reales, colección personal y comparación de logros entre amigos. No poner comparación antes que la actividad social en móvil.
    ```



### [SOCIAL] XP por tiempo real de escucha y sesiones

- tags: [backend, friends, xp, kb-35]
- priority: medium
- workload: Hard
    ```md
    Aprobado: hitos de sesión a 10, 20, 30 y 60 minutos de escucha real; excluir pausas, seeks y dispositivos duplicados. Conservar XP anterior, premios idempotentes y progreso persistente. Importes iniciales ajustables por política. PR separado del rediseño de Friends.
    ```


### [FRIENDS] Vocabulary desde el Excel

- tags: [frontend, i18n, vocabulary, kb-34]
- priority: medium
- workload: Easy
    ```md
    Etiquetas de Friends y De/Para localizados en Vocabulary.xlsx (en/es/fr), tipos y fallback generados desde el Excel; generación sin escrituras de BD. Auditadas las referencias de vocabulario de Friends. Pendiente de revisión de Ignacio. Sin tests locales.
    ```


### [FRIENDS] Mejorar UI/UX de la página de friends

- tags: [frontend, friends, ui, ux, kb-33]
- priority: high
- workload: Normal
    ```md
    Rama separada: feat/friends-listening-space. Propuesta con música y personas primero, actividad sin tarjetas repetidas, directorio con búsqueda e invitaciones, vistas de escucha conjunta/compartidos y rankings bajo demanda. Revisión de pantallas grandes: ancho disponible completo, actividad en paralelo y columna de sesiones/compartidos en ultrawide, mediante container queries. Diseño pendiente de revisión de Ignacio. Sin tests locales.

    Mejorar el diseño general de la página de friends y eliminar el aspecto "vibecodeado".
    ```


## Done
