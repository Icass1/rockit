# Buscar canciones dentro de Library

Al escribir en la búsqueda de Library, All y Songs muestran una sección de canciones. Incluye canciones guardadas directamente y las contenidas en álbumes o playlists guardadas, también anidadas. Se muestra la portada, título, artista y nombre del álbum. Los otros tipos conservan su búsqueda por metadatos de primer nivel; no se sustituye una coincidencia de canción por la tarjeta de su álbum.

Al pulsar una canción, `SongCard` y `SongRow` reemplazan la cola con una lista de un solo elemento. No se expande ni se encola el álbum, la playlist o el resto de resultados. Los archivos deben estar disponibles para reproducirse mediante el comportamiento existente de Rockit. Teclado Enter/Espacio y selección múltiple siguen disponibles. Los menús distinguen las canciones guardadas directamente de las alcanzadas por una colección para no ofrecer eliminar una entrada inexistente de Library.

## Consulta y permisos

`GET /user/library/songs/search` requiere sesión. Acepta `query` (1–200 caracteres), `offset`, `limit` (1–100, por defecto 50) y `sort` (`relevance`, `name_asc`, `name_desc`, `recent`). Devuelve canciones hidratadas, total y datos de paginación. Una consulta de espacios devuelve una página vacía sin recorrer colecciones.

El acceso utiliza las mismas fuentes de nombres, aristas y visibilidad que Collection. Un CTE recursivo parte únicamente de las entradas de Library del usuario y comprueba visibilidad en las raíces y en cada salto. UNION deduplica las rutas y termina ante ciclos. Las aristas respetan desactivaciones globales y por usuario, así como permisos de playlists privadas y colaboradores. Una colección pública ajena no se busca salvo que sea alcanzable desde esa Library.

Se buscan títulos y el contexto aportado por los índices de los providers (artistas y álbumes). Las palabras pueden coincidir entre título y contexto. Se normaliza Unicode a NFC, mayúsculas/minúsculas, acentos latinos habituales y apóstrofos/guiones tipográficos. `%` y `_` se tratan literalmente. Si falta una imagen o entrada del índice contextual, el nombre del tema sigue siendo buscable mediante el índice de nombres de Collection. No es búsqueda fonética ni corrección de erratas.

La deduplicación y el orden se aplican antes del recuento y la página. Relevancia prioriza título exacto y prefijo; los empates se estabilizan por ID público. `recent` ordena por fecha de incorporación de la canción al catálogo, no por fecha de cada colección que la contiene. Dos grabaciones con IDs distintos se conservan aunque compartan título, evitando mezclar versiones.

Hay dos consultas SQL de selección (recuento y página), independientes del número de colecciones; se hidrata solo esa página en lotes por provider. No hay peticiones por álbum, expansión completa en el navegador, consultas externas ni descargas. SQL en access, coordinación en framework, HTTP en controller. Sin migraciones ni cambios de almacenamiento o S3.

## Interfaz y fallos

El cliente espera 300 ms tras escribir, pide 50 canciones y ofrece Mostrar más. Invalida resultados al cambiar consulta, orden o cuenta, e ignora respuestas tardías. Cambios de Library/membresía de playlists y recuperación de conexión refrescan la búsqueda. La carga, el resultado vacío y el fallo se distinguen con estados accesibles y reintento; ante un fallo se mantienen coincidencias directas ya conocidas o páginas cargadas, con un aviso de búsqueda incompleta. No se persisten nuevas cachés de resultados ni se promete búsqueda completa de colecciones offline.

Las vistas normales sin consulta conservan su contenido y su reproducción. Las recomendaciones se ocultan mientras hay una búsqueda para dar prioridad a los resultados. Esta rama está encadenada sobre PR158. Las tarjetas/filas reutilizadas conservan sus superficies de drag & drop; las superficies de reproducción accesibles por teclado se identifican como zonas de arrastre para no bloquear el gesto.

## Validación

Revisión dirigida en Chromium con hook, resultados, tarjetas/filas y selección reales, usando HTTP y metadatos simulados: 11 comprobaciones aprobadas, sin errores de página. Se revisaron búsqueda limitada/debounce, paginación, reproducción individual con clic y teclado, menús para canciones anidadas, respuestas tardías, fallo/reintento y cambio de cuenta. Capturas de escritorio y filas a ancho móvil. Tras combinar ambas tareas se repitieron estas 11 comprobaciones y las 11 de drag & drop, también aprobadas. No prueba persistencia de una instalación real, reproducción de archivos, S3 ni Safari/dispositivos físicos.

Regresiones preparadas para CI ejecutan la consulta SQL real sobre un grafo SQLite aislado (funciones equivalentes para normalización), con duplicados, álbumes/listas anidados, ciclos, permisos, revocaciones, desactivaciones, aislamiento entre usuarios, Unicode y comodines literales. SQLite no sustituye validar el plan/rendimiento con una biblioteca PostgreSQL de producción. No se ejecutaron suites locales por preferencia del usuario.
