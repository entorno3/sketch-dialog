/*!
 * sketch-dialog.js
 * Abre cualquier página/sketch (p5.js, etc.) en un <dialog> nativo con el
 * iframe escalado y centrado. Sin dependencias. Aplica un estilo propio mínimo
 * (fondo transparente, cruz de cierre sutil) que prevalece sobre el de los
 * frameworks CSS; se personaliza con variables CSS o se desactiva con
 * configure({ skin: false }).
 *
 * Uso declarativo:
 *   <button data-sketch="ruta/index.html">Abrir</button>
 *   <script src="sketch-dialog.js" defer></script>
 *
 * Atributos opcionales del elemento:
 *   data-title="Título"   título del diálogo (también se usa como title del iframe)
 *   data-w="800"          ancho original del sketch (si no, se detecta del <canvas>)
 *   data-h="450"          alto original del sketch
 *   data-max-h="0.6"      fracción del alto de la ventana que puede ocupar (0–1)
 *
 * Uso programático:
 *   SketchDialog.open('ruta/index.html', { title: 'Mi sketch', w: 800, h: 450, maxH: 0.7 });
 *   SketchDialog.close();
 *   SketchDialog.configure({ skin: false, dialogClass: 'max', closeClass: 'circle transparent' });
 *
 * Nota: la detección de tamaño y la limpieza de márgenes solo funcionan con
 * sketches del mismo origen. Con otro origen, indicar siempre data-w y data-h.
 */
(() => {
  if (window.SketchDialog) return; // evita doble carga

  const FALLBACK = { w: 800, h: 450 };
  const DEFAULT_MAX_H = 0.6;

  // Dos hojas. ESTRUCTURA: imprescindible para que el escalado funcione. SKIN: apariencia, desactivable.
  // Los selectores llevan el prefijo dialog.sd (especificidad 0,2,1 o más) para prevalecer sobre
  // los estilos de elementos (dialog, button, h5, iframe) de frameworks y resets CSS.
  // Variables: --sd-color, --sd-backdrop, --sd-width.
  const CSS_STRUCTURE = `
    dialog.sd .sd-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    dialog.sd .sd-close { flex: none; cursor: pointer; }
    dialog.sd .sd-frame { width: 100%; overflow: hidden; }
    dialog.sd .sd-frame iframe { display: block; border: 0; max-width: none; max-height: none; transform-origin: top left; }`;

  const CSS_SKIN = `
    dialog.sd { width: var(--sd-width, min(92vw, 1000px)); max-width: none; margin: auto; box-sizing: border-box;
      padding: 1rem; border: 0; box-shadow: none; background: transparent; color: var(--sd-color, #fff); }
    dialog.sd::backdrop { background: var(--sd-backdrop, rgba(0, 0, 0, .85)); }
    dialog.sd .sd-title { margin: 0; font-family: inherit; font-size: 1rem; font-weight: 500; line-height: 1.3; color: inherit; }
    dialog.sd .sd-close { display: grid; place-items: center; width: 2rem; height: 2rem; margin: 0; padding: 0;
      border: 0; border-radius: 50%; box-shadow: none; background: none; color: inherit; opacity: .6; transition: opacity .15s; }
    dialog.sd .sd-close:hover { opacity: 1; background: none; }
    dialog.sd .sd-close:focus-visible { opacity: 1; outline: 2px solid currentColor; outline-offset: 2px; }`;

  let dlg, title, wrap, frame, closeBtn, skinEl;
  const config = { skin: true, dialogClass: '', closeClass: '' };
  let session = 0;          // se incrementa en cada apertura/cierre: invalida detecciones viejas
  let maxH = DEFAULT_MAX_H;

  // Escala y centra el iframe dentro del contenedor
  const fit = () => {
    const w = +frame.dataset.w, h = +frame.dataset.h, avail = wrap.clientWidth;
    if (!w || !h || !avail) return;
    const s = Math.min(1, avail / w, (innerHeight * maxH) / h);
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.style.transform = `translateX(${(avail - w * s) / 2}px) scale(${s})`;
    wrap.style.height = h * s + 'px';
  };

  // Si no se indicó tamaño, lo lee del <canvas> (mismo origen) o usa el de reserva
  const detect = (id, tries = 30) => {
    if (id !== session) return; // el diálogo se cerró o se abrió otro sketch
    let c;
    try { c = frame.contentDocument?.querySelector('canvas'); } catch (e) {}
    if (c && c.offsetWidth) {
      frame.dataset.w = c.offsetWidth;
      frame.dataset.h = c.offsetHeight;
      fit();
    } else if (tries) {
      setTimeout(() => detect(id, tries - 1), 100);
    } else {
      frame.dataset.w = FALLBACK.w;
      frame.dataset.h = FALLBACK.h;
      fit();
    }
  };

  // Elimina el margen de 8px del <body> y el hueco bajo el <canvas>,
  // que provocan descentrado y scroll interno (solo mismo origen)
  const clean = () => {
    try {
      const d = frame.contentDocument;
      const st = d.createElement('style');
      st.textContent = 'html,body{margin:0!important;padding:0!important;overflow:hidden!important}canvas{display:block!important}';
      d.head.appendChild(st);
    } catch (e) {}
  };

  // Aplica la configuración (clases de framework y skin propio) al diálogo ya construido
  const applyConfig = () => {
    if (!dlg) return;
    dlg.className = ('sd ' + config.dialogClass).trim();
    closeBtn.className = ('sd-close ' + config.closeClass).trim();
    skinEl.disabled = !config.skin;
  };

  const configure = (opts = {}) => {
    Object.assign(config, opts);
    applyConfig();
  };

  // Crea el diálogo una sola vez, al primer uso (no depende de dónde se cargue el script)
  const build = () => {
    if (dlg) return;

    document.head.insertAdjacentHTML('beforeend', `<style>${CSS_STRUCTURE}</style><style>${CSS_SKIN}</style>`);
    skinEl = document.head.lastElementChild;

    dlg = document.createElement('dialog');
    dlg.setAttribute('aria-labelledby', 'sd-title');
    dlg.innerHTML = `
      <div class="sd-head">
        <h5 class="sd-title" id="sd-title"></h5>
        <button type="button" class="sd-close" aria-label="Cerrar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="sd-frame"><iframe allowfullscreen></iframe></div>`;
    document.body.appendChild(dlg);

    title = dlg.querySelector('.sd-title');
    wrap = dlg.querySelector('.sd-frame');
    frame = wrap.querySelector('iframe');

    frame.addEventListener('load', () => {
      // ignora la carga inicial vacía y la de about:blank al cerrar
      if (!frame.getAttribute('src') || frame.src === 'about:blank') return;
      clean();
      frame.dataset.w ? fit() : detect(session);
    });

    new ResizeObserver(fit).observe(wrap);
    addEventListener('resize', fit); // el alto de la ventana no altera el ancho de wrap

    closeBtn = dlg.querySelector('.sd-close');
    closeBtn.addEventListener('click', close);
    applyConfig();

    // Al cerrar (botón o Esc) se vacía el iframe para detener el sketch
    dlg.addEventListener('close', () => {
      session++;
      frame.src = 'about:blank';
      frame.removeAttribute('title');
      frame.style.transform = '';
      wrap.style.height = '';
    });
  };

  const open = (url, opts = {}) => {
    if (!url) return;
    build();
    session++;
    maxH = opts.maxH > 0 && opts.maxH <= 1 ? opts.maxH : DEFAULT_MAX_H;
    title.textContent = opts.title || '';
    frame.title = opts.title || 'Sketch';
    frame.dataset.w = opts.w || '';
    frame.dataset.h = opts.h || '';
    frame.src = url;
    if (!dlg.open) dlg.showModal();
  };

  const close = () => { if (dlg && dlg.open) dlg.close(); };

  // Apertura declarativa por delegación: funciona con elementos creados dinámicamente
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sketch]');
    if (!el) return;
    e.preventDefault(); // por si el elemento es un <a>
    open(el.dataset.sketch, {
      title: el.dataset.title,
      w: +el.dataset.w || '',
      h: +el.dataset.h || '',
      maxH: parseFloat(el.dataset.maxH)
    });
  });

  window.SketchDialog = { open, close, configure };
})();
