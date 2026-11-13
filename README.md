# sketch-dialog

Abre cualquier sketch (p5.js u otra página) en un `<dialog>` con el iframe escalado y centrado, sin modificar el sketch original.

- Sin dependencias.
- Se activa con un atributo en el botón: `data-sketch`.
- Funciona en HTML simple y junto a librerías o frameworks (BeerCSS, Bootstrap, etc.).
- Detecta automáticamente el tamaño del canvas y lo adapta al espacio disponible.
- Al cerrar el diálogo, detiene el sketch.

## Uso

1. Copiá `sketch-dialog.js` a tu proyecto.
2. Agregá un botón con la ruta al sketch:

```html
<button data-sketch="ruta/al/sketch/index.html" data-title="Título">Abrir</button>
```

3. Cargá el script al final del `<body>`:

```html
<script src="sketch-dialog.js"></script>
```

Para otro sketch, solo cambia la ruta. Podés tener todos los botones que quieras: comparten el mismo diálogo.

### Desde CDN

```html
<script src="https://cdn.jsdelivr.net/gh/entorno3/sketch-dialog@1.0.1/sketch-dialog.js"></script>
```

## Atributos del botón

| Atributo       | Obligatorio | Descripción                                                          |
| -------------- | ----------- | -------------------------------------------------------------------- |
| `data-sketch`  | Sí          | Ruta a la página o sketch que se mostrará en el iframe.              |
| `data-title`   | No          | Título del diálogo.                                                  |
| `data-w`       | No          | Ancho original del sketch en píxeles. Si falta, se detecta del canvas. |
| `data-h`       | No          | Alto original del sketch en píxeles. Si falta, se detecta del canvas.  |

Si no puede detectar el tamaño, usa 800 × 450 por defecto.

## Requisitos y límites

- Navegador moderno (`<dialog>` y `ResizeObserver`).
- Cargar el script al final del `<body>` o con el atributo `defer`.
- Para detectar el tamaño del canvas y quitar los márgenes internos del sketch, este debe estar en el **mismo origen** que la página (servidor local o sitio propio; no `file://`). En otros casos, indicá `data-w` y `data-h`.
- Usa el `<dialog>` nativo. Si BeerCSS está cargado, toma su estilo gracias a `class="max"`.

## Créditos

Creado en el marco de la materia *Programación para medios interactivos orientada a las tecnologías web* por el equipo docente, con asistencia de IA.

## Licencia:

[MIT](https://opensource.org/license/mit): uso libre, incluso comercial, conservando el aviso de autoría y licencia. Se ofrece "tal cual", sin garantía. Ver el archivo [LICENSE](LICENSE).

## Historial de cambios

- **v1.0**: versión inicial.
