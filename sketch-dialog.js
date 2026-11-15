/*!
 * sketch-dialog.js  v2.0.0  (2026)
 *
 * Abre cualquier página o sketch (p5.js, etc.) en un <dialog> con el iframe
 * escalado y centrado. Sin dependencias; usa el <dialog> nativo y,
 * si está cargado, toma el estilo de BeerCSS (class="max").
 *
 * Novedades de la v2
 *   - Indicador de carga minimalista (solo la palabra "Cargando…") hasta que
 *     el sketch está listo.
 *   - Fondo del diálogo a pantalla completa, oscuro y semitransparente. Se sale
 *     con la tecla ESC, el botón de cierre o el botón "Reintentar" tras un aviso.
 *   - Avisos simples cuando algo falla (ruta incorrecta, imágenes que no
 *     cargan, error de JavaScript, p5.js ausente, demora excesiva), con
 *     sugerencias de qué revisar y un botón "Reintentar".
 *   - Puede cargarse en cualquier parte del documento (el diálogo se crea
 *     al primer uso).
 *
 * Créditos
 *   Creado en el marco de la materia "Programación para medios interactivos
 *   orientada a las tecnologías web" por el equipo docente, con asistencia de IA.
 *
 * Licencia
 *   Uso libre bajo licencia MIT (ver archivo LICENSE del repositorio):
 *   https://opensource.org/license/mit
 *   Se ofrece "tal cual", sin garantía de ningún tipo.
 *   SPDX-License-Identifier: MIT
 *
 * Compatibilidad
 *   Funciona en HTML simple y también junto a librerías o frameworks CSS/JS
 *   (BeerCSS, Bootstrap, etc.). Detecta los botones por delegación de eventos,
 *   por lo que sirve también con botones agregados dinámicamente.
 *
 * Requisitos y límites
 *   - Navegador moderno (<dialog>, ResizeObserver).
 *   - Para detectar el tamaño del canvas, quitar márgenes internos y dar
 *     avisos de error, el sketch debe estar en el mismo origen (servidor local
 *     o sitio propio, no file://). En otro caso solo se muestra el indicador
 *     de carga; indicar data-w y data-h en el botón.
 *
 * Uso:
 *   <button data-sketch="ruta/index.html">Abrir</button>
 *   <script src="sketch-dialog.js"></script>
 *
 * Atributos opcionales del botón:
 *   data-title="Título"   título del diálogo
 *   data-w="800"          ancho original del sketch (si no, se detecta del <canvas>)
 *   data-h="450"          alto original del sketch
 *   data-timeout="10"     segundos de espera antes de avisar que no cargó (por defecto 10)
 *
 * Variables CSS opcionales (en :root o en dialog.sd):
 *   --sd-bg      fondo del diálogo (por defecto rgba(0, 0, 0, .85))
 *   --sd-color   color del texto y de los íconos (por defecto #fff)
 */
(() => {
  if (window.__sketchDialogLoaded) return; // evita doble carga
  window.__sketchDialogLoaded = true;

  const FALLBACK = { w: 800, h: 450 };  // tamaño de reserva (px)
  const DEFAULT_TIMEOUT = 10;           // segundos
  const RESOURCE_GRACE = 2500;          // ms que se espera tras detectar un archivo que no cargó
  const POLL = 100;                     // ms entre revisiones

  // Textos de la interfaz (editables)
  const TEXT = {
    loading: 'Cargando…',
    errorTitle: 'Tenemos un problemita',
    closing: 'A revisar',
    retry: 'Reintentar'
  };

  // Sugerencias que se repiten en varios avisos (editables)
  const TIP_F12 = 'Abrí la consola del navegador con F12 (o Ctrl+Shift+I; en Mac, Cmd+Opción+I). ' +
    'En la pestaña "Consola" los errores aparecen en rojo, con el nombre del archivo y el número de línea donde ocurren. ' +
    'En la pestaña "Red" (Network), los archivos que no se encontraron aparecen en rojo con el código 404: ahí se ve exactamente qué ruta no existe.';
  const TIP_ASSETS = 'Las rutas de imágenes, fuentes o datos que carga el sketch (por ejemplo, en loadImage) se leen a partir de la carpeta del propio sketch, ' +
    'es decir, donde está su index.html, y no de la página que tiene el botón. ' +
    'Si el archivo está en una subcarpeta, la ruta es "img/foto.png"; si está una carpeta más arriba, es "../foto.png".';
  const TIP_NAMES = 'Revisá que el nombre y la extensión coincidan exactamente: en un servidor, "Foto.png", "foto.png" y "foto.jpg" son archivos distintos. ' +
    'Conviene evitar espacios y acentos en los nombres de archivos y carpetas.';

  // Aviso y sugerencias para cada tipo de falla (editables)
  const CASES = {
    notfound: {
      msg: 'No se encontró el archivo del sketch.',
      tips: [
        'La ruta de data-sketch se escribe a partir de la carpeta de la página donde está el botón. ' +
          'Por ejemplo, si la página está en "curso/index.html" y el sketch en "curso/sketches/uno/index.html", la ruta es "sketches/uno/index.html".',
        'Comprobá que cada carpeta y el archivo existan y estén escritos igual, con las mismas mayúsculas y minúsculas: en un servidor, "Sketch" y "sketch" son nombres distintos.',
        'Verificá que el archivo termine en .html.',
        TIP_F12
      ]
    },
    http: {
      msg: 'El servidor no pudo entregar el sketch.',
      tips: [
        'Revisá la ruta de data-sketch: se escribe a partir de la carpeta de la página donde está el botón.',
        'Verificá que el servidor local (por ejemplo, Live Server) o el sitio estén funcionando.',
        TIP_F12
      ]
    },
    resource: {
      msg: 'El sketch no pudo cargar uno o más archivos (imágenes, fuentes, datos).',
      tips: [TIP_ASSETS, TIP_NAMES, TIP_F12]
    },
    timeout: {
      msg: 'El sketch tardó demasiado en iniciar.',
      tips: [
        'Suele pasar cuando una imagen, fuente o dato que se carga en preload() no se encuentra y el sketch queda esperando.',
        TIP_ASSETS,
        TIP_F12
      ]
    },
    script: {
      msg: 'El sketch tiene un error de JavaScript y no pudo iniciar.',
      tips: [
        'En la consola (pestaña "Consola") el error aparece en rojo, con el nombre del archivo y la línea donde ocurre. Empezá por el primero de la lista: los demás suelen ser consecuencia.',
        'Probá abrir el sketch directamente en el navegador, fuera del diálogo, para ver si falla igual.',
        TIP_F12
      ]
    },
    p5: {
      msg: 'No se cargó la biblioteca p5.js.',
      tips: [
        'Revisá la ruta del <script> que incluye p5.js en el index.html del sketch: se lee a partir de la carpeta del sketch.',
        'Si se carga desde internet (un CDN), verificá la conexión.',
        TIP_F12
      ]
    }
  };
  const FILE_TIP = 'Estás abriendo la página con file://. Probá con un servidor local (por ejemplo, la extensión Live Server de VS Code).';

  const CSS = `
    dialog.sd[open] { width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 1rem;
      border: 0; box-sizing: border-box; box-shadow: none;
      background: var(--sd-bg, rgba(0, 0, 0, .85)); color: var(--sd-color, #fff); }
    dialog.sd::backdrop { background: transparent; }
    dialog.sd .sd-close { color: inherit !important; }
    dialog.sd .sd-retry { color: inherit !important; border-color: currentColor !important; }
    .sd-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .sd-head h5 { margin: 0; }
    .sd-close { cursor: pointer; flex: none; }
    .sd-frame { position: relative; width: 100%; overflow: hidden; }
    .sd-frame iframe { display: block; border: 0; transform-origin: top left; }
    .sd-frame.sd-busy { min-height: 60vh; }
    .sd-frame.sd-busy iframe { position: absolute; top: 0; left: 0; visibility: hidden; }
    .sd-status { display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 60vh; padding: 1rem; text-align: center; }
    .sd-status[hidden] { display: none; }
    .sd-load { font-size: 1.1rem; letter-spacing: .08em; animation: sd-pulse 1.4s ease-in-out infinite; }
    @keyframes sd-pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .sd-load { animation: none; } }
    .sd-err { max-width: 38rem; text-align: left; }
    .sd-err h6 { margin: 0 0 .5rem; }
    .sd-err p { margin: 0 0 .5rem; }
    .sd-err ul { margin: 0 0 .75rem; padding-left: 1.25rem; }
    .sd-notes { font: .8rem/1.4 monospace; opacity: .75; overflow-wrap: anywhere; }`;

  let dlg, title, wrap, frame, status;
  let state = 'idle';      // idle | loading | ready | error
  let session = 0;         // cambia en cada apertura/cierre: invalida esperas viejas
  let last = null;         // última apertura (para "Reintentar")
  let check = Promise.resolve(null);
  let timeoutMs = DEFAULT_TIMEOUT * 1000;
  let notes = [];          // detalles recogidos del sketch (máx. 3)
  let fatal = false;       // error de JavaScript antes de crear el canvas
  let resourceFailedAt = 0;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const note = (txt) => {
    txt = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (txt && !notes.includes(txt) && notes.length < 3) notes.push(txt);
  };
  const resourceFailed = () => { resourceFailedAt = resourceFailedAt || Date.now(); };

  // Muestra el estado actual: cargando, listo o error
  const render = (kind) => {
    wrap.classList.toggle('sd-busy', state !== 'ready');
    status.hidden = state === 'ready';
    status.setAttribute('role', state === 'error' ? 'alert' : 'status');
    if (state === 'loading') {
      status.innerHTML = `<div class="sd-load">${esc(TEXT.loading)}</div>`;
    }
    if (state === 'error') {
      const c = CASES[kind] || CASES.timeout;
      const tips = c.tips.concat(location.protocol === 'file:' ? [FILE_TIP] : []);
      status.innerHTML = `<div class="sd-err">
        <h6>${esc(TEXT.errorTitle)}</h6>
        <p>${esc(c.msg)}</p>
        <ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${notes.length ? `<p class="sd-notes">${notes.map(esc).join('<br>')}</p>` : ''}
        <p class="sd-closing"><strong>${esc(TEXT.closing)}</strong></p>
        <button type="button" class="border sd-retry">${esc(TEXT.retry)}</button>
      </div>`;
    }
  };

  const ready = () => {
    if (state !== 'loading') return;
    state = 'ready';
    render();
    fit();
  };

  const fail = (kind) => {
    if (state !== 'loading') return;
    state = 'error';
    wrap.style.height = '';
    frame.src = 'about:blank'; // detiene el sketch
    render(kind);
  };

  // Escala y centra el iframe dentro del contenedor
  const fit = () => {
    if (state !== 'ready') return;
    const w = +frame.dataset.w, h = +frame.dataset.h, avail = wrap.clientWidth;
    if (!w || !h || !avail) return;
    const s = Math.min(1, avail / w, (innerHeight * 0.6) / h);
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transform = `translateX(${(avail - w * s) / 2}px) scale(${s})`;
    wrap.style.height = h * s + 'px';
  };

  const useFallbackSize = () => {
    if (!frame.dataset.w) { frame.dataset.w = FALLBACK.w; frame.dataset.h = FALLBACK.h; }
  };

  // Elimina el margen de 8px del <body> y el hueco bajo el <canvas>,
  // que provocan descentrado y scroll interno (mismo origen)
  const clean = (doc) => {
    try {
      const st = doc.createElement('style');
      st.textContent = 'html,body{margin:0!important;padding:0!important;overflow:hidden!important}canvas{display:block!important}';
      doc.head.appendChild(st);
    } catch (e) {}
  };

  // Escucha los errores del sketch (mismo origen) para poder explicarlos
  const hook = (win) => {
    try {
      win.addEventListener('keydown', (e) => { if (e.key === 'Escape') dlg.close(); }); // ESC con el foco dentro del sketch
      win.addEventListener('error', (e) => {
        const t = e.target;
        if (t && t !== win && (t.src || t.href)) {            // recurso del HTML que no cargó
          note('No se pudo cargar: ' + (t.getAttribute('src') || t.getAttribute('href')));
          resourceFailed();
        } else if (e.message && !/^ResizeObserver/.test(e.message)) {  // error de JavaScript
          note(e.message);
          fatal = true;
        }
      }, true);
      win.addEventListener('unhandledrejection', (e) => note(e.reason && e.reason.message || e.reason));

      // p5 y el navegador avisan por consola cuando un archivo no carga
      const FAIL = /problem loading|failed to load|could not load|not found|404|failed to fetch|networkerror/i;
      ['log', 'warn', 'error'].forEach((k) => {
        const orig = win.console[k];
        win.console[k] = (...args) => {
          try {
            const text = args.map((a) => (typeof a === 'string' ? a : (a && a.message) || '')).join(' ');
            const src = args.map((a) => a && a.target && a.target.src).find(Boolean); // evento "error" de una imagen
            if (src) { note('No se pudo cargar: ' + src); resourceFailed(); }
            if (k === 'error' || FAIL.test(text)) note(text);
            if (FAIL.test(text)) resourceFailed();
          } catch (e) {}
          return orig.apply(win.console, args);
        };
      });
    } catch (e) {}
  };

  // Espera a que el sketch esté listo (canvas creado) o a que falle
  const watch = (id, win, doc) => {
    const t0 = Date.now();
    const tick = () => {
      if (id !== session || state !== 'loading') return;
      const c = doc.querySelector('canvas');
      if (c && c.offsetWidth) {
        if (!frame.dataset.w) { frame.dataset.w = c.offsetWidth; frame.dataset.h = c.offsetHeight; }
        return ready();
      }
      const p = win.p5 && win.p5.instance;
      if (p && p._setupDone) { useFallbackSize(); return ready(); }  // sketch sin canvas (p5 1.x)
      if (fatal) return fail('script');
      if (resourceFailedAt && Date.now() - resourceFailedAt > RESOURCE_GRACE) return fail('resource');
      if (Date.now() - t0 > timeoutMs) return fail('timeout');
      setTimeout(tick, POLL);
    };
    tick();
  };

  // Se ejecuta cuando el iframe terminó de cargar el documento
  const inspect = (id) => {
    let win = null, doc = null;
    try { win = frame.contentWindow; doc = frame.contentDocument; } catch (e) {}
    if (!doc || !win) {            // otro origen: no se puede inspeccionar
      useFallbackSize();
      return ready();
    }
    clean(doc);
    hook(win);
    for (const im of doc.images) { // imágenes del HTML que no cargaron
      const src = im.getAttribute('src') || '';
      if (im.complete && !im.naturalWidth && !/\.svg(\?|#|$)/i.test(src)) {
        note('No se pudo cargar la imagen: ' + src);
        resourceFailed();
      }
    }
    const wantsP5 = [...doc.scripts].some((s) => /p5(\.min)?\.js/i.test(s.getAttribute('src') || ''));
    if (wantsP5 && !win.p5) return fail('p5');
    if (!win.p5 && !doc.querySelector('canvas')) { // página común, sin canvas: lista al cargar
      useFallbackSize();
      return ready();
    }
    watch(id, win, doc);
  };

  // Comprueba que el archivo exista (solo mismo origen y con servidor)
  const precheck = (url) => {
    let u;
    try { u = new URL(url, location.href); } catch (e) { return Promise.resolve(null); }
    if (location.protocol === 'file:' || u.origin !== location.origin) return Promise.resolve(null);
    return fetch(u.href, { method: 'HEAD' }).then((r) => {
      if (r.ok || r.status === 405 || r.status === 501) return null; // 405/501: el servidor no admite HEAD
      return r.status === 404 || r.status === 410 ? 'notfound' : 'http';
    }).catch(() => null);
  };

  // Crea el diálogo una sola vez, al primer uso
  const build = () => {
    if (dlg) return;
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);

    dlg = document.createElement('dialog');
    dlg.className = 'max sd';
    dlg.innerHTML = `
      <div class="sd-head">
        <h5 class="sd-title"></h5>
        <button type="button" class="circle transparent sd-close" aria-label="Cerrar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="sd-frame sd-busy">
        <iframe scrolling="no" allowfullscreen></iframe>
        <div class="sd-status" role="status" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(dlg);

    title = dlg.querySelector('.sd-title');
    wrap = dlg.querySelector('.sd-frame');
    frame = wrap.querySelector('iframe');
    status = wrap.querySelector('.sd-status');

    frame.addEventListener('load', () => {
      if (state !== 'loading' || frame.src === 'about:blank') return;
      const id = session;
      check.then((kind) => {
        if (id !== session) return;
        kind ? fail(kind) : inspect(id);
      });
    });

    new ResizeObserver(fit).observe(wrap);
    addEventListener('resize', fit);

    dlg.querySelector('.sd-close').addEventListener('click', () => dlg.close());

    // Al cerrar (botón o Esc) se vacía el iframe para detener el sketch
    dlg.addEventListener('close', () => {
      session++;
      state = 'idle';
      frame.src = 'about:blank';
    });
  };

  const launch = (url, o) => {
    build();
    const id = ++session;
    last = { url, o };
    notes = []; fatal = false; resourceFailedAt = 0;
    timeoutMs = (+o.timeout > 0 ? +o.timeout : DEFAULT_TIMEOUT) * 1000;
    state = 'loading';

    title.textContent = o.title || '';
    dlg.setAttribute('aria-label', o.title || 'Sketch');
    frame.title = o.title || 'Sketch';
    frame.removeAttribute('style');          // sin medidas de la apertura anterior
    frame.dataset.w = o.w || '';
    frame.dataset.h = o.h || '';
    wrap.style.height = '';
    render();

    check = precheck(url);
    check.then((kind) => { if (kind && id === session) fail(kind); });
    frame.src = url;
    if (!dlg.open) dlg.showModal();
  };

  // Apertura por delegación: funciona con botones creados dinámicamente
  document.addEventListener('click', (e) => {
    if (e.target.closest('.sd-retry') && last) return launch(last.url, last.o);
    const btn = e.target.closest('[data-sketch]');
    if (!btn) return;
    e.preventDefault(); // por si el elemento es un <a>
    launch(btn.dataset.sketch, {
      title: btn.dataset.title,
      w: btn.dataset.w,
      h: btn.dataset.h,
      timeout: btn.dataset.timeout
    });
  });
})();
