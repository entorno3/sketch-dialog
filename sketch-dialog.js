/*!
 * sketch-dialog.js  v1.0.1 (2026)
 *
 * Abre cualquier página o sketch (p5.js, etc.) en un <dialog> con el iframe
 * escalado y centrado. Sin dependencias; usa el <dialog> nativo y,
 * si está cargado, toma el estilo de BeerCSS (class="max").
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
 *   - Cargar al final del <body> o con el atributo defer.
 *   - Para detectar el tamaño del canvas y quitar márgenes internos, el sketch
 *     debe estar en el mismo origen (servidor local o sitio propio, no file://).
 *     En otro caso, indicar data-w y data-h en el botón.
 *
 * Uso:
 *   <button data-sketch="ruta/index.html">Abrir</button>
 *   <script src="sketch-dialog.js"></script>
 *
 * Atributos opcionales del botón:
 *   data-title="Título"   título del diálogo
 *   data-w="800"          ancho original del sketch (si no, se detecta del <canvas>)
 *   data-h="450"          alto original del sketch
 */
(() => {
  const FALLBACK = { w: 800, h: 450 };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .sd-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .sd-head h5 { margin: 0; }
    .sd-close { cursor: pointer; flex: none; }
    .sd-frame { width: 100%; overflow: hidden; }
    .sd-frame iframe { display: block; border: 0; transform-origin: top left; }
  </style>`);

  // Estructura del diálogo (se crea una sola vez y se reutiliza)
  const dlg = document.createElement('dialog');
  dlg.className = 'max';
  dlg.innerHTML = `
    <div class="sd-head">
      <h5 class="sd-title"></h5>
      <button class="circle transparent sd-close" aria-label="Cerrar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="sd-frame"><iframe scrolling="no" allowfullscreen></iframe></div>`;
  document.body.appendChild(dlg);

  const title = dlg.querySelector('.sd-title');
  const wrap = dlg.querySelector('.sd-frame');
  const frame = wrap.querySelector('iframe');

  // Escala y centra el iframe dentro del contenedor
  const fit = () => {
    const w = +frame.dataset.w, h = +frame.dataset.h, avail = wrap.clientWidth;
    if (!w || !h || !avail) return;
    const s = Math.min(1, avail / w, (innerHeight * 0.6) / h);
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transform = `translateX(${(avail - w * s) / 2}px) scale(${s})`;
    wrap.style.height = h * s + 'px';
  };

  // Si no se indicó tamaño, lo lee del <canvas> (mismo origen) o usa el de reserva
  const detect = (tries = 30) => {
    let c;
    try { c = frame.contentDocument?.querySelector('canvas'); } catch (e) {}
    if (c && c.offsetWidth) {
      frame.dataset.w = c.offsetWidth;
      frame.dataset.h = c.offsetHeight;
      fit();
    } else if (tries) {
      setTimeout(() => detect(tries - 1), 100);
    } else {
      frame.dataset.w = FALLBACK.w;
      frame.dataset.h = FALLBACK.h;
      fit();
    }
  };

  // Elimina el margen de 8px del <body> y el hueco bajo el <canvas>,
  // que son los que provocan el descentrado y el scroll interno (mismo origen)
  const clean = () => {
    try {
      const d = frame.contentDocument;
      const st = d.createElement('style');
      st.textContent = 'html,body{margin:0!important;padding:0!important;overflow:hidden!important}canvas{display:block!important}';
      d.head.appendChild(st);
    } catch (e) {}
  };

  frame.addEventListener('load', () => {
    if (frame.src === 'about:blank') return;
    clean();
    frame.dataset.w ? fit() : detect();
  });
  new ResizeObserver(fit).observe(wrap);
  addEventListener('resize', fit);

  // Abrir
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sketch]');
    if (!btn) return;
    title.textContent = btn.dataset.title || '';
    frame.dataset.w = btn.dataset.w || '';
    frame.dataset.h = btn.dataset.h || '';
    frame.src = btn.dataset.sketch;
    dlg.showModal();
  });

  // Cerrar (y detener el sketch vaciando el iframe)
  dlg.querySelector('.sd-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { frame.src = 'about:blank'; });
})();
