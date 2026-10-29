# Library: añadir a playlists mediante arrastre

En All, una canción o un álbum se puede arrastrar sobre una playlist propia, tanto en tarjetas como en filas. La operación añade una referencia y conserva el origen en Library. Los álbumes usan la operación existente de colección completa, sin descargar archivos ni enviar una petición por canción.

El gesto se activa con ratón o trackpad después de recorrer ocho píxeles. Muestra mano cerrada, portada flotante y un círculo verde con un + blanco cuando el destino es válido. La playlist se resalta; durante el guardado muestra actividad y solo confirma el éxito tras la respuesta del servidor. Los errores se notifican y liberan el destino para reintentar.

Escape, pérdida de foco, cancelación del puntero y desmontaje cancelan el arrastre. Hay desplazamiento automático cerca de los bordes visibles. Un arrastre no dispara reproducción, navegación ni menú contextual al soltar. La selección múltiple para ZIP desactiva este gesto. En pantallas táctiles y para teclado se mantiene la acción existente del menú para añadir a una playlist; no se intercepta el desplazamiento táctil. Se respetan movimiento reducido y colores forzados, con anuncios accesibles del destino y guardado.

## Permisos y persistencia

Los destinos proceden del listado de playlists propias del servidor. No se consulta la red durante el movimiento. Al soltar se vuelve a consultar ese listado y se comprueba la pertenencia antes de enviar la escritura; no se compara el nombre visible del propietario. El endpoint existente mantiene su autorización. Se bloquean escrituras simultáneas desde este gesto hacia la misma playlist. Las referencias de canciones descargadas en el almacenamiento offline se actualizan solo tras una respuesta satisfactoria.

No se modifica backend funcional, migraciones, S3 ni objetos existentes. La búsqueda de canciones dentro de álbumes queda fuera de esta entrega.

## Validación

Revisión dirigida en Chromium con los componentes y el manager reales, portadas locales y respuestas HTTP simuladas: canción y álbum, tarjetas y filas, clic normal, destinos ajenos, propiedad retirada antes de soltar, fallo del servidor, Escape, selección ZIP, desplazamiento automático y limpieza al desmontar. Once comprobaciones aprobadas y ningún error de página. Esto comprueba la interacción y las llamadas realizadas; no demuestra persistencia contra una instalación real ni valida Safari o dispositivos táctiles físicos.

Las regresiones de CI ejercitan las utilidades y el manager reales con fixtures: umbral y desplazamiento, tipos permitidos, propiedad, operación única para álbumes, errores, referencias offline y bloqueo de duplicados. No se ejecutaron suites locales por preferencia del usuario.

Las nuevas cadenas se mantienen en Vocabulary.xlsx (en/es/fr) y se regeneran los tipos compartidos mediante el generador existente.
