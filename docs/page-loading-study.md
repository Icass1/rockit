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

## Reproducción: siguientes mejoras propuestas

Revisión de código, sin nuevas mediciones de primer sonido. Orden provisional por
impacto esperado en los casos afectados; no son mejoras implementadas en este PR:

1. **Audio de vídeos, primera reproducción:** `MediaStream._encode_audio_async`
   espera a que ffmpeg termine el MP3 completo antes de servirlo. Preparar esa
   representación al descargar el vídeo, conservando la caché y sus byte ranges,
   trasladaría el trabajo fuera del clic de reproducción. Medir por separado caché
   fría y caliente; afecta al modo audio de vídeos, no a toda canción de YouTube.
2. **Spotify, entrega del archivo:** `Spotify.get_audio_with_range_async` hace
   `open/read` síncrono del rango completo antes de devolver los bytes. Un rango
   abierto puede abarcar todo el archivo. Servir desde archivo por streaming con
   soporte de Range evitaría esa lectura completa previa y reduciría memoria y
   bloqueo del event loop. Validar seeks, rangos inválidos y clientes concurrentes.
3. **Siguiente canción:** `preloadNextTrack` utiliza `metadata` salvo cuando están
   activadas las transiciones y el mezclador está funcionando. Evaluar precarga de
   audio de la siguiente canción con política de consumo de datos; `auto` puede
   descargar todo el archivo y es una sugerencia que el navegador puede ignorar.
   Además, el camino ordinario vuelve a asignar la URL al reproductor principal;
   verificar reutilización efectiva del buffer antes de cambiarlo.
4. **Cambios rápidos:** `BaseMediaPlayerManager.setMedia` espera la promesa de carga
   anterior antes de iniciar la siguiente. Medir pulsaciones consecutivas de Next
   y resolución offline; evaluar cancelación o descarte temprano sin introducir
   carreras entre fuentes ni romper sincronización remota.

Para comparar: clic → evento `playing` como aproximación de arranque (no prueba de
sonido físicamente audible), TTFB de audio, pausas entre pistas y p50/p95; usar
archivos reales de cada proveedor, descargas frías/calientes y una cola grande.
También registrar bytes, CPU/RAM y pruebas de Range antes/después.

Se contrastó el significado de `metadata`/`auto` y su carácter orientativo con
[MDN: audio/preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio#preload).
