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

- Home/Library muestran un snapshot de IndexedDB por cuenta mientras consultan la
  red. La respuesta real actualiza la pantalla y prevalece sobre una lectura local
  tardía. La medición original usaba la estrategia de Serwist, sustituida tras la
  revisión para evitar que una revalidación solo actualizase la caché del worker.
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
   Las consultas simultáneas de notificaciones ahora se agrupan como se detalla abajo;
   sigue pendiente estudiar la carga social.
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

## Menos competencia de peticiones en segundo plano

`NotificationManager.refreshAsync` podía lanzar consultas simultáneas desde el inicio
de sesión, foco/conexión y eventos de descargas. Ahora comparte la consulta activa.
Si llega otra solicitud durante la espera, realiza una consulta final para recoger
los cambios posteriores. No añade un temporizador de espera ni modifica los toasts
inmediatos, los intervalos de actualización o el contrato del backend.

Una prueba con 21 llamadas solapadas verifica dos consultas HTTP secuenciales en vez
de 21 concurrentes y que se muestran los datos de la última consulta. También se
comprueba que cambiar de cuenta no espera a la anterior y que una excepción de
transporte permite reintentar. Las nueve pruebas de notificaciones pasan. Esto
reduce tráfico redundante durante ráfagas; no se ha medido una reducción de latencia
de páginas o descargas externas atribuible a este cambio.

## Correcciones tras revisar el PR

- El snapshot de Library en IndexedDB utiliza una clave por usuario. No se lee la
  antigua clave compartida y se elimina durante las transiciones de autenticación.
  El hook vincula cada carga a la cuenta y al estado de sesión; oculta el snapshot
  anterior e ignora respuestas pendientes tras un cambio de cuenta. La respuesta de
  red sigue prevaleciendo sobre una lectura offline que termine más tarde.
- La expansión de colecciones conserva los resultados válidos cuando otra colección
  falla y continúa con las siguientes. Play Library y los botones por categoría
  muestran un aviso al terminar, sin convertir los errores del proveedor en éxitos.
- Las tandas nuevas se mezclan con la parte pendiente de la cola aleatoria. Se
  conservan el prefijo ya recorrido, la canción actual, los IDs y el orden normal;
  continúa habiendo una única sincronización por tanda.

Se actualizaron los casos de regresión correspondientes, incluidos aislamiento de
cuentas, errores parciales y mezcla de tandas. Por indicación del usuario no se
ejecutaron tests locales para estas correcciones; su validación se delega en CI.

## Colas con canciones disponibles y sin descargar

La recuperación de errores del reproductor esperaba un segundo antes de avanzar.
Además, la selección publicaba el ID solicitado antes de comprobar su descarga y
la precarga miraba únicamente la posición contigua de la cola.

Ahora la selección busca la siguiente entrada disponible antes de publicar su ID,
respetando dirección, orden actual y estaciones de radio. El clic sobre una canción
usa esa misma selección. La precarga y las transiciones también miran más allá de
las canciones sin descargar. Si ninguna entrada está disponible, se pausa sin
intentar cargar una canción conocida como ausente.

Un error real de archivo avanza a la siguiente candidata sin el temporizador de un
segundo. Se recuerdan los fallos durante esa cadena de errores y se pausa si no
queda otra candidata; el registro se reinicia al empezar a reproducir correctamente
o cambiar de cola. Repeat-one conserva la espera entre reintentos, con protección
contra reintentos antiguos tras una pausa o un cambio de canción.

Se añadieron casos para saltos consecutivos, dirección inversa, radio, cola sin
descargas, precarga y cadenas de archivos fallidos. No se ejecutaron localmente;
la validación se deja a CI. No se ha medido el ahorro exacto en producción: se elimina
una espera explícita del código, no la latencia de cargar el siguiente audio.

## Correcciones de la revisión completa

- `LibraryPlaybackManager` concentra la carga progresiva y su estado de actividad;
  el botón queda limitado a representar y solicitar play/pause. No se marca el
  arranque por la existencia de metadatos: se conservan las entradas pendientes
  hasta encontrar una descargada, incluso si llega en una tanda posterior.
- `useAccountCachedData` comparte la carga de Home y Library. Lee el snapshot por
  cuenta y aplica la respuesta HTTP real al estado de la misma pantalla. Esas dos
  rutas usan NetworkOnly en el service worker; el fallback offline pertenece al
  hook, evitando dos capas que revalidaban sin comunicarse. Home tiene su propio
  store de metadatos en la versión 4 de IndexedDB; no almacena audio adicional.
- Las modificaciones de la cola web solicitan actualizar la precarga si hay
  reproducción activa. El reproductor deduplica por ID y URL, de modo que reutilizar
  un ID en otra cola tampoco conserva una fuente equivocada. Se mantiene la política
  existente de precargar una siguiente canción.
- Las actividades locales se identifican por su clave para evitar repetir el toast
  al recibirlas del servidor. Una escritura invalida las respuestas anteriores sin
  silenciar eventos nuevos que procedan de otras acciones o dispositivos.

Los casos de regresión incluyen el manager y la cola reales para el arranque tras
entradas sin descargar, la actualización de precarga, datos cacheados seguidos de
datos frescos, cambios de cuenta y actividad local durante un refresco pendiente.
No se ejecutaron localmente por indicación del usuario; se delega la validación en
CI. No se repitieron las mediciones de tiempos de carga tras estos ajustes.
