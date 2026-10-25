# Rockit Kanban Board

## To Do

### [SETTINGS] Subida de imagen de perfil y avatar por defecto

- tags: [settings, profile, bug]
- priority: high
- workload: Normal
    ```md
    Hacer funcional la subida de imagen de perfil y corregir el avatar default, que ahora mismo no se ve bien en la página de settings (parece que apunta mal).
    ```

### [FRIENDS] Mejorar UI/UX de la página de friends

- tags: [friends, ui, ux]
- priority: high
- workload: Normal
    ```md
    Mejorar el diseño general de la página de friends y eliminar el aspecto "vibecodeado".
    ```

### [PLAYER] Pantalla vertical: dividir el PlayerUI por la mitad

- tags: [player, mobile, layout]
- priority: medium
- workload: Normal
- steps:
    - [ ] Validar la implementación actual con Ignacio
    - [ ] Dividir el PlayerUI por la mitad en pantalla vertical
    ```md
    Pantalla vertical: dividir por la mitad el PlayerUI. Pendiente de que Ignacio valide la versión actual antes de implementar.
    ```

### [TRANSITIONS] Tiempo de transición personalizado

- tags: [transitions, settings, ui]
- priority: medium
- workload: Normal
    ```md
    Permitir configurar las transiciones con un tiempo custom en lugar de usar presets de una lista desplegable.
    ```

### [PWA] Revisar transiciones en PWA iOS (iPhone)

- tags: [pwa, ios, transitions]
- priority: high
- workload: Normal
    ```md
    Revisar y corregir las transiciones de la PWA en iOS/iPhone.
    ```

### [LIBRARY] Centrar botón library y arreglar random

- tags: [library, queue, bug, ui]
- priority: high
- workload: Normal
- steps:
    - [ ] Centrar verticalmente el botón de library
    - [ ] Revisar el random de la library: solo coge canciones sueltas y las coloca en una posición random de la queue
    ```md
    Arreglar el botón de library centrándolo verticalmente y revisar el comportamiento del random de la library. Actualmente solo pilla canciones sueltas y las pone en una posición random de la queue.
    ```

### [LIBRARY] Investigar tiempo de carga

- tags: [library, performance]
- priority: medium
- workload: Easy
- steps:
    - [ ] Confirmar con Ignacio si la library tarda un segundo en cargar
    ```md
    La library tarda un segundo en cargar? Confirmar con Ignacio antes de tocar nada.
    ```

### [FRIENDS] Arreglar contador de personas online

- tags: [friends, bug]
- priority: medium
- workload: Easy
    ```md
    Poner bien el contador de personas online en la página de friends.
    ```

### [PWA] Mejorar UI de radios en PWA iOS

- tags: [pwa, ios, ui]
- priority: medium
- workload: Normal
    ```md
    Mejorar el aspecto de los inputs radio en la PWA de iOS.
    ```

### [PLAYER] Tiempos reales de la barra de reproducción

- tags: [player, playback, bug]
- priority: high
- workload: Normal
    ```md
    Fixear los tiempos de la barra de reproducción para que sean los reales. Revisar si vienen de videoclips. Cuidado con no romper las lyrics.
    ```

### [LYRICS] Mejorar detección y asignación de lyrics

- tags: [lyrics, matching]
- priority: high
- workload: Normal
    ```md
    Mejorar la detección o assignment de las lyrics a las canciones para que se detecte mejor la canción que se está reproduciendo.
    ```

### [DOWNLOADS] Descargar solo música y no videoclips

- tags: [downloads, spotdl, ytdlp]
- priority: medium
- workload: Normal
    ```md
    Intentar que spotdl o yt-dlp descargue solo música que no sean videoclips. Ajustar la búsqueda.
    ```

### [TRANSITIONS] Quitar silencio inicial/final con transiciones activas

- tags: [transitions, player, audio]
- priority: medium
- workload: Hard
    ```md
    Quitar el silencio final/inicial de las canciones cuando las transiciones están activadas. Cuidado con esto.
    ```

### [PLAYER] Añadir modo vinilo en web móvil

- tags: [player, mobile, ui]
- priority: medium
- workload: Normal
    ```md
    Añadir el modo vinilo a la versión web móvil.
    ```

### [BUG] Botón play/pause incorrecto al cambiar de canción con transiciones en iOS

- tags: [player, ios, transitions, bug]
- priority: high
- workload: Easy
    ```md
    Cuando las transiciones están activas en iOS y pasa a la siguiente canción, la canción suena pero el botón muestra play en vez de pause, como si tuviese que reproducirse pero ya está sonando. Cuidado con no romper lo que ya funciona.
    ```

## In Progress

## Idle

## To Review

## Done
