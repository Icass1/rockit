# Fijados en navegación

Se pueden fijar álbumes, playlists y artistas existentes en el catálogo mediante el menú contextual. No se fijan canciones, vídeos, emisoras ni perfiles de usuario. La página de artista ofrece ahora un menú de opciones cuando tiene una identidad de catálogo real; un perfil sintético por nombre sin ID no se convierte automáticamente en un artista ni se importa para fijarlo.

La barra lateral solo muestra el separador recortado, el icono Pin de Lucide y la sección Fijados cuando hay entradas visibles. Contraída muestra portadas de 32 px con nombre accesible y tooltip; expandida añade el nombre y un botón para desfijar. Álbumes y playlists tienen esquinas redondeadas; artistas, imagen circular. Abrir un fijado navega a su página y no modifica la cola. La lista tiene scroll propio, foco visible y alternativa sin animación con movimiento reducido. Se conserva la navegación inferior móvil existente; los menús permiten gestionar los fijados desde web móvil para usarlos en la barra lateral de escritorio.

## Persistencia y permisos

`core.user_navigation_pin` guarda únicamente `user_id`, `media_id` y fecha de incorporación. La clave primaria compuesta hace idempotente fijar otra vez el mismo elemento. Las claves foráneas eliminan la referencia al borrar su usuario o medio. La tabla se registra en el metadata existente y se crea mediante `create_all` durante el arranque normal del backend. No se modifica la migración de almacenamiento, el registro de migraciones, S3 ni objetos existentes. No se ha ejecutado DDL sobre ninguna instalación real durante este trabajo.

Los fijados son independientes de Library. Desfijar no elimina medios, descargas ni membresías de Library/playlists. Se conservan por usuario entre sesiones y dispositivos. El orden es la fecha de fijado, con ID público para desempates; no incluye reordenación manual.

API autenticada:

- `GET /user/navigation/pins`: resúmenes visibles actuales.
- `POST /user/navigation/pins` con `publicId`: fija solo tipos soportados y accesibles.
- `DELETE /user/navigation/pins/{public_id}`: elimina solo la referencia del usuario actual, incluso si perdió acceso al destino.

La selección de metadatos usa una consulta SQL sobre los resúmenes registrados por los providers, sin importarlos concretamente en Core, y los mismos filtros de visibilidad que Collection. Las playlists privadas se comprueban al fijar y en cada listado; si se revoca acceso, se ocultan sin borrar automáticamente la referencia. Recuperar el permiso permite que reaparezcan. Los álbumes/artistas no tienen restricciones adicionales de propiedad en el modelo actual. Los enlaces de destino siguen sujetos a su autorización habitual.

Las imágenes se resuelven en lote con Image y el almacenamiento existente. No se expanden las pistas de álbumes/listas, no se consulta el catálogo externo ni se hacen peticiones HTTP por fijado. Un fallo de portada usa la imagen de sustitución.

## Estado del cliente

El manager carga en segundo plano al iniciar la cuenta y refresca al recuperar foco, visibilidad o conexión. Los cambios hechos desde otro dispositivo se ven al refrescar; no hay un nuevo canal websocket de sincronización instantánea. Eventos de activación simultáneos comparten la carga en curso. No se añade una caché de fijados en disco ni se guardan URLs firmadas entre sesiones.

Se serializan las escrituras, se bloquean clics repetidos sobre el mismo ID y se publica la lista confirmada por el servidor. Un GET anterior no puede sobrescribir una escritura posterior. Al salir o cambiar de cuenta se vacían los átomos; las respuestas de la cuenta anterior se ignoran. Errores de carga/escritura ofrecen reintento y nunca se anuncian como guardado correcto. Textos en Vocabulary.xlsx y tipos generados para en/es/fr.

## Validación

Revisión dirigida en Chromium con Navigation, NavigationPins, PinNavigationAction y manager reales, usando HTTP/cuentas/portadas de ejemplo: 12 comprobaciones aprobadas, sin errores de página. Se revisaron estado vacío, tipos admitidos, confirmación de guardado, formas de portada, expansión con teclado, navegación, desfijado, errores/reintento, cambio de cuenta, scroll y movimiento reducido. Las tarjetas de ejemplo del centro sirven para abrir la acción aislada; no son una reproducción completa de Library. No demuestra persistencia de una instalación real ni valida Safari/dispositivos físicos.

Regresiones para CI: consulta SQL real en SQLite aislado con operaciones idempotentes, aislamiento, permisos/revocaciones, borrado en cascada y resolución de imágenes en lote; manager real con fixtures para escrituras serializadas, respuestas tardías, errores y cambios de cuenta. No se ejecutaron suites locales por preferencia del usuario. SQLite no sustituye una validación de despliegue sobre PostgreSQL.
