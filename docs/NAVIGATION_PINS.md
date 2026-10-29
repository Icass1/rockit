# Anclados en navegación

Se pueden anclar álbumes, playlists y artistas existentes en el catálogo mediante el menú contextual (clic derecho, pulsación larga o Mayús+F10). No se fijan canciones, vídeos, emisoras ni perfiles de usuario. La página de artista ofrece ahora un menú de opciones cuando tiene una identidad de catálogo real; un perfil sintético por nombre sin ID no se convierte automáticamente en un artista ni se importa para anclarlo.

La barra lateral solo muestra el separador recortado, el icono Pin de Lucide y la sección Anclados cuando hay entradas visibles. Contraída muestra portadas de 32 px con nombre accesible y tooltip; expandida añade el nombre. No hay botones permanentes para anclar o desanclar: se usa el menú contextual de la tarjeta o del acceso directo. Álbumes y playlists tienen esquinas redondeadas; artistas, imagen circular. Abrir un anclado navega a su página y no modifica la cola. La lista tiene scroll propio, foco visible y alternativa sin animación con movimiento reducido. Se conserva la navegación inferior móvil existente; los menús permiten gestionar los anclados desde web móvil para usarlos en la barra lateral de escritorio.

## Persistencia y permisos

`core.user_navigation_list_pin` guarda referencias personales a las cinco listas dinámicas de Rockit: Me gusta, más escuchadas, mix reciente, mix del mes pasado y resumen anual. No necesitan una fila en core.media ni se copian sus canciones.

`core.user_navigation_pin` guarda únicamente `user_id`, `media_id` y fecha de incorporación. La clave primaria compuesta hace idempotente anclar otra vez el mismo elemento. Las claves foráneas eliminan la referencia al borrar su usuario o medio. Ambas tablas se registran en el metadata existente y se crean mediante `create_all` durante el arranque normal del backend. No se modifica la migración de almacenamiento, el registro de migraciones, S3 ni objetos existentes. No se ha ejecutado DDL sobre ninguna instalación real durante este trabajo.

Los anclados son independientes de Library. Desanclar no elimina medios, descargas ni membresías de Library/playlists. Se conservan por usuario entre sesiones y dispositivos. Las listas de Rockit aparecen primero en orden predefinido; los otros accesos se ordenan por fecha e ID público para desempates. No incluye reordenación manual.

API autenticada:

- `GET /user/navigation/pins`: resúmenes visibles actuales.
- `POST /user/navigation/pins` con `publicId`: fija solo tipos soportados y accesibles.
- `DELETE /user/navigation/pins/{public_id}`: elimina solo la referencia del usuario actual, incluso si perdió acceso al destino.

La selección de metadatos usa una consulta SQL sobre los resúmenes registrados por los providers, sin importarlos concretamente en Core, y los mismos filtros de visibilidad que Collection. Las playlists privadas se comprueban al anclar y en cada listado; si se revoca acceso, se ocultan sin borrar automáticamente la referencia. Recuperar el permiso permite que reaparezcan. Los álbumes/artistas no tienen restricciones adicionales de propiedad en el modelo actual. Los enlaces de destino siguen sujetos a su autorización habitual.

Las imágenes se resuelven en lote con Image y el almacenamiento existente. No se expanden las pistas de álbumes/listas, no se consulta el catálogo externo ni se hacen peticiones HTTP por anclado. Un fallo de portada usa la imagen de sustitución.

## Valores iniciales para cuentas nuevas

El registro solicita Me gusta, más escuchadas y mix reciente. Se guardan en un único lote dentro de la misma transacción que crea el usuario, antes del commit. Si falla ese lote, se revierte el alta. No se aplica una migración ni se insertan anclados a usuarios existentes.

GET, login y refresco solo leen; nunca regeneran los valores iniciales. Por tanto, desanclar esas tres listas, o dejar la sección vacía, persiste entre sesiones. Se pueden volver a anclar desde sus menús. Los nombres de las listas de Rockit se traducen en el cliente; las imágenes pequeñas conservan símbolos distintivos.

## Estado del cliente

El manager carga en segundo plano al iniciar la cuenta y refresca al recuperar foco, visibilidad o conexión. Los cambios hechos desde otro dispositivo se ven al refrescar; no hay un nuevo canal websocket de sincronización instantánea. Eventos de activación simultáneos comparten la carga en curso. No se añade una caché de anclados en disco ni se guardan URLs firmadas entre sesiones.

Se serializan las escrituras, se bloquean clics repetidos sobre el mismo ID y se publica la lista confirmada por el servidor. Un GET anterior no puede sobrescribir una escritura posterior. Al salir o cambiar de cuenta se vacían los átomos; las respuestas de la cuenta anterior se ignoran. Errores de carga/escritura ofrecen reintento y nunca se anuncian como guardado correcto. Textos en Vocabulary.xlsx y tipos generados para en/es/fr. En español se usa Anclados / Anclar / Desanclar.

## Validación

Revisión dirigida actualizada en Chromium con la navegación, las cinco tarjetas de listas de Rockit, los menús contextuales y el manager reales, usando HTTP/cuentas simulados: 11 comprobaciones aprobadas, sin errores de página. Se verificaron los tres anclados iniciales, ausencia de botones permanentes, clic derecho, Mayús+F10/Enter, pulsación larga en viewport táctil, acciones desde la barra, tipos de portada, estado vacío, errores/reintento y cierre de sesión. Las portadas de Rockit son assets existentes y las de catálogo son ejemplos; no reproduce toda Library ni demuestra persistencia en una instalación real.

Se corrigió el cierre prematuro del menú en Chromium al soltar el botón derecho que acababa de abrirlo; abrir un menú contextual en otra tarjeta cierra el anterior. Se respeta el gesto de pulsación larga y el cierre con clic fuera.

Regresiones para CI: consultas SQL reales en SQLite aislado con operaciones idempotentes, aislamiento, permisos/revocaciones, borrado en cascada y resolución de imágenes en lote; valores iniciales solo en registro, rollback del alta si falla el guardado y no restauración de anclados eliminados. Manager real con fixtures para concurrencia y cuentas, y trigger real para liberación del botón derecho, cierre entre menús y Mayús+F10. No se ejecutaron suites locales por preferencia del usuario. SQLite no sustituye una validación de despliegue sobre PostgreSQL.
