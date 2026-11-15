# sketch-dialog

Abre cualquier sketch (p5.js u otra página) en un `<dialog>` a pantalla completa, con el iframe escalado y centrado, sin modificar el sketch original.

- Sin dependencias.
- Se activa con un atributo en el botón: `data-sketch`.
- Funciona en HTML simple y junto a librerías o frameworks (BeerCSS, Bootstrap, etc.).
- Detecta el tamaño del canvas y lo adapta al espacio disponible.
- Muestra "Cargando…" hasta que el sketch está listo.
- Si algo falla, explica qué revisar (rutas, consola, p5.js) y ofrece reintentar.
- Se cierra con **ESC** o con la cruz, y al cerrar detiene el sketch.

## Uso

1. Copiá `sketch-dialog.js` a tu proyecto.
2. Agregá un botón con la ruta al sketch:

```html
<button data-sketch="ruta/al/sketch/index.html" data-title="Título">Abrir</button>
```

3. Cargá el script, en cualquier parte del documento:

```html
<script src="sketch-dialog.js"></script>
```

Para otro sketch, solo cambia la ruta. Podés tener todos los botones que quieras: comparten el mismo diálogo.

### Desde CDN

```html
<script src="https://cdn.jsdelivr.net/gh/entorno3/sketch-dialog@2.0.0/sketch-dialog.js"></script>
```

## Atributos del botón

| Atributo       | Obligatorio | Descripción                                                                     |
| -------------- | ----------- | ------------------------------------------------------------------------------- |
| `data-sketch`  | Sí          | Ruta a la página o sketch que se mostrará en el iframe.                         |
| `data-title`   | No          | Título del diálogo.                                                             |
| `data-w`       | No          | Ancho original del sketch en píxeles. Si falta, se detecta del canvas.          |
| `data-h`       | No          | Alto original del sketch en píxeles. Si falta, se detecta del canvas.           |
| `data-timeout` | No          | Segundos de espera antes de avisar que el sketch no inició. Por defecto, 10.    |

Si no puede detectar el tamaño, usa 800 × 450 por defecto.

## Avisos cuando algo falla

El diálogo muestra el título "Tenemos un problemita", la causa probable, qué revisar y un botón **Reintentar**.

| Situación                                      | Qué indica                                           |
| ---------------------------------------------- | ---------------------------------------------------- |
| El archivo del sketch no existe (404)          | Revisar la ruta de `data-sketch`                     |
| Una imagen, fuente o dato no carga             | Revisar las rutas que usa el sketch                  |
| El sketch no termina de iniciar                | Revisar lo que se carga en `preload()`               |
| Error de JavaScript antes de crear el canvas   | Abrir la consola (F12)                               |
| No se carga p5.js                              | Revisar el `<script>` de p5.js o la conexión         |
| Página abierta con `file://`                   | Usar un servidor local (por ejemplo, Live Server)    |

Los textos están al comienzo de `sketch-dialog.js` (objetos `TEXT`, `HELP` y `CASES`) y se pueden adaptar.

## Personalización

El diálogo usa un fondo oscuro semitransparente. Se ajusta con variables CSS:

```css
:root {
  --sd-bg: rgba(20, 20, 30, .8);   /* color y transparencia del fondo */
  --sd-color: #fff;                /* texto y cruz de cierre */
}
```

## Requisitos y límites

- Navegador moderno (`<dialog>` y `ResizeObserver`).
- La página debe declarar `<meta charset="utf-8">` para que las tildes se vean bien.
- Para detectar el tamaño del canvas, quitar los márgenes internos, dar avisos de error y cerrar con ESC desde dentro del sketch, este debe estar en el **mismo origen** que la página (servidor local o sitio propio; no `file://`). Con otro origen solo se muestra "Cargando…" y hay que indicar `data-w` y `data-h`.
- No detecta errores de sintaxis como tales: el aviso aparece cuando vence la espera.

## Migrar desde v1

- Cambiá el enlace del CDN a `@2.0.0`, o actualizá el archivo.
- El diálogo ahora tiene fondo oscuro semitransparente a pantalla completa, en lugar del estilo del framework.
- Ya no es necesario cargar el script al final del `<body>`.
- Las versiones `v1.0.1` y anteriores siguen disponibles y no cambian.

## Créditos

Creado en el marco de la materia *Programación para medios interactivos orientada a las tecnologías web* por el equipo docente, con asistencia de IA.

## Licencia

[MIT](https://opensource.org/license/mit): uso libre, incluso comercial, conservando el aviso de autoría y licencia. Se ofrece "tal cual", sin garantía. Ver el archivo [LICENSE](LICENSE).

## Historial de cambios

- **v2.0.0**: indicador "Cargando…"; avisos de error con sugerencias y botón Reintentar; fondo a pantalla completa semitransparente; cierre con ESC también desde dentro del sketch; atributo `data-timeout`; el script puede cargarse en cualquier parte del documento.
- **v1.0.1**: el release incluye el encabezado de créditos y la licencia MIT.
- **v1.0**: versión inicial.
