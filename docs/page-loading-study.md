# Estudio de carga: Home, Library y reproducción

Fecha: 2026-10-24. Base: `origin/develop` en `6e681842`.

## Alcance y método

Mediciones locales con PostgreSQL, FastAPI, Next.js en producción y Chromium headless,
sin throttling de red/CPU. Usuario de prueba con 3.000 canciones RockIt sintéticas,
sin historial de escuchas y con cola vacía. No se consultó el servidor doméstico ni
se modificaron datos de producción. Las canciones sintéticas no contienen audio:
no se midió clic → primer sonido real.

API: diez peticiones secuenciales medidas después de una de calentamiento por ruta;
se mide hasta leer el cuerpo completo. No son percentiles de producción.
Repetir con `python scripts/benchmark_routes.py --base-url URL --cookie-file ARCHIVO`.
El archivo de cookies debe pertenecer a una cuenta de pruebas y no debe publicarse.

Navegador: navegación completa a `/`, `/library`, `/`, `/library`, en ese orden,
con un contexto nuevo por ejecución. Se registra DOMContentLoaded y tiempo hasta
contenido seguido de dos animation frames. Library espera el texto de una canción;
Home espera que desaparezca el skeleton. No es una medida de LCP, INP ni de todas
las imágenes terminadas. Comparación antes/después del commit que limita la vista
«Todo»; ambos lados ya incluyen los cambios de caché y reproducción anteriores.
Solo una ejecución por variante: los resultados son indicativos, sin significancia
estadística. Home vacía no representa recomendaciones con un historial real.

## Resultados

| API | Mediana | Máximo | Cuerpo |
| --- | ---: | ---: | ---: |
| `/user/session` | 5,6 ms | 6,7 ms | 177 B |
| `/stats/home` (sin historial) | 12,3 ms | 16,1 ms | 181 B |
| `/user/library/medias` | 584,5 ms | 829,1 ms | 1.786.648 B |
| `/user/queue` (vacía) | 10,8 ms | 47,4 ms | 60 B |

| Library | Antes | Después |
| --- | ---: | ---: |
| Primera entrada: contenido | 6.361 ms | 2.090 ms |
| Segunda entrada: contenido | 4.889 ms | 672 ms |
| Primera entrada: DOMContentLoaded | 315 ms | 392 ms |
| Nodos DOM iniciales | 33.358 | 1.459 |

El coste dominante observado es resolver/transferir la biblioteca completa y montar
sus miles de tarjetas, no los pocos milisegundos de la sesión. El HTML inicial no
se aceleró en esta muestra; la mejora está en el contenido de Library. Home registró
2.154/867 ms antes y 1.320/567 ms después, pero no atribuimos esa diferencia al cambio
de Library: el contenido y DOM de Home no cambiaron entre ambas ejecuciones.

## Cambios acotados

- Home/Library usan el snapshot de Serwist mientras revalidan. IndexedDB se lee desde
  el inicio en Library; una respuesta de red nueva prevalece sobre la copia local.
- «Todo» dibuja inicialmente hasta 100 elementos por categoría; «cargar más» amplía
  el límite en 100. Buscar, filtrar y reproducir siguen usando el conjunto completo.
  No es paginación del backend ni virtualización: el cuerpo completo sigue llegando.
- Play Library inicia canciones disponibles antes de expandir colecciones. Resuelve
  hasta cuatro colecciones a la vez, por el endpoint completo existente. Añade una
  tanda con una sincronización; abandona resultados si el usuario sustituye la cola.
- La selección inicial respeta random; la mezcla usa Fisher–Yates. En carga progresiva,
  la elección inicial está limitada a los elementos ya disponibles, no es un sorteo
  uniforme entre todos los elementos aún pendientes de resolver.
- Las consultas de proveedores de Library dejan de compartir una AsyncSession entre
  tareas concurrentes. Se conserva la transacción existente, ejecutando en secuencia.
- Next.js puede utilizar BACKEND_INTERNAL_URL; Compose lo configura en la red interna.
  Uvicorn deja de arrancar con --reload. No se cambia el número de workers.

## Rutas y seguridad

OpenAPI actual: 159 paths, 168 operaciones. Inventario por prefijo:
friends 28; media 21; user 13; downloader 12; admin/default 11 cada uno; upload 8;
rockit 7; featured 6; spotify/spotify_scrapper 5 cada uno;
auth/bookmark/notifications/stats/radio/youtube 4 cada uno;
vocabulary/version/lrclib 3 cada uno; lyrics/metadata/request 2 cada uno;
image/youtube-music 1 cada uno.

Se revisaron los caminos de Home, Library, sesión, cola y colecciones, sus dependencias
de autenticación y límites de entrada. Ocho rutas esenciales existentes respondieron
401 sin cookie: sesión, biblioteca, cola, Home, items/playable de colecciones,
friends y notifications. Las nueve pruebas de integración de colecciones pasan,
incluidos acceso privado, colaboradores, límites, ciclos y contenido anidado.
Esto no es una auditoría de seguridad exhaustiva de las 168 operaciones ni una
medición de cada API externa. Los 404 de proveedores no se consideran por sí solos
un problema de rendimiento ni se convierten en respuestas exitosas.

## Siguientes prioridades basadas en evidencia

1. Paginar Library en servidor con búsqueda/ordenación y un contrato separado para
   reproducir todo; evita descargar 1,79 MB antes de reproducir una biblioteca grande.
2. Virtualizar vistas extensas: «cargar más» acota el inicio, pero el DOM crece con el uso.
3. Medir Home con historial representativo antes de cambiar sus consultas; el navegador
   también observó peticiones de notificaciones repetidas y carga de datos sociales.
   Determinar qué componentes las disparan antes de modificar los managers globales.
4. Medir colas pobladas, proveedores externos, imágenes y primer sonido con audio real.
5. Instrumentar proxy/ASGI: el logging actual espera un commit fuera de su propio
   cronómetro y no mide la transferencia completa. Se documenta, sin reescribirlo aquí.

Referencias: [Serwist](https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies),
[SQLAlchemy AsyncSession](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html#using-asyncsession-with-concurrent-tasks),
[Next.js fetching](https://nextjs.org/docs/app/getting-started/fetching-data).

## Reproducción: mejora sin almacenamiento adicional

Spotify, Spotify Scrapper y YouTube Music leían el rango solicitado completo con
`open/read` síncrono antes de construir la respuesta. Un rango abierto podía cargar
la canción entera en RAM y bloquear el event loop durante la lectura.

Ahora los tres delegan en `MediaStream.stream_audio_file_async`: envían el archivo
existente con lecturas asíncronas de hasta 64 KiB, bajo demanda. No se crea ninguna
copia ni se descargan más canciones. Se reutiliza el manejo de rangos que ya usaba
el modo audio de vídeos; se mantienen el MIME y la ruta pública de cada proveedor.
Los rangos abiertos, cerrados y sufijos producen bytes exactos; los rangos inválidos,
fuera del archivo o múltiples reciben 416. Una respuesta completa devuelve 200 sin
Content-Range, y una parcial 206 con Content-Range y Content-Length correctos.
El navegador conserva soporte para su sonda inicial y los saltos dentro del audio.

La función común consulta los metadatos del archivo fuera del event loop y devuelve
404 si el archivo no existe. Cada petición tiene su propio descriptor; el contexto
asíncrono cierra el archivo al terminar o al cerrar el generador. La memoria de los
bloques queda acotada, aunque el servidor/proxy puede añadir sus propios buffers.
La conversión bajo demanda de vídeos ya existente sigue usando esta entrega común;
no se añade conversión anticipada ni se modifica su política de almacenamiento.

Pruebas: peticiones HTTP a los tres controladores con la consulta de DB sustituida;
sondas de dos bytes, saltos, sufijos, límites, rangos inválidos y archivos ausentes.
Además se comprueba lectura perezosa por bloques, cierre anticipado y rangos
concurrentes independientes. Las pruebas existentes de conversión de vídeo también
cubren esta función común. Son pruebas de transporte con datos binarios, no una
medición de primer sonido real ni una prueba física en Safari. Las 180 pruebas
unitarias del backend pasan, además de Black y Pyright sin errores.

Validación adicional en Chromium headless: reproducción mediante HTMLAudioElement y
seek al segundo 3 de un MP3 real de cinco segundos, generado temporalmente con ffmpeg.
Los tres controladores reprodujeron y completaron el seek sin error de decodificación;
solo la consulta de DB estaba simulada. Se eliminó el archivo de prueba al terminar.
No se comprobó salida física por altavoces ni un dispositivo Safari.

Se contrastó la solución con la documentación de
[StreamingResponse de Starlette 0.27.0](https://github.com/encode/starlette/blob/0.27.0/docs/responses.md#streamingresponse),
la versión fijada por el proyecto. Su FileResponse todavía no implementa Range;
por eso se conserva el manejo explícito de rangos.

### Pendientes de medir

- `BaseMediaPlayerManager.setMedia` espera la promesa de carga anterior antes de
  iniciar la siguiente. Evaluar cancelación o descarte temprano tras medir Next
  repetido, resolución offline y sincronización entre dispositivos.
- La precarga habitual usa `metadata`. No se amplía a `auto`: puede descargar la
  siguiente canción completa. Tampoco se prepara audio adicional al descargar vídeos,
  conforme a la preferencia de limitar almacenamiento y descargas.

Para comparar: clic → evento `playing` como aproximación de arranque (no prueba de
sonido físicamente audible), TTFB, pausas entre pistas y p50/p95; usar audio real de
cada proveedor, caché fría/caliente y colas grandes. Registrar también bytes y CPU/RAM.
No se atribuye todavía una reducción medida de latencia a este cambio.

Referencia de precarga:
[MDN: audio/preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio#preload).
