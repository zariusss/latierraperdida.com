(function () {
  // =========================
  // Config
  // =========================
  const STORAGE_KEY = 'ltp_platform';
  const DEFAULT_JSON_URL = '../../assets/data/e-narrativo-test.json';

  const labelMap = {
    spotify: 'Spotify',
    ivoox: 'iVoox',
    apple: 'Apple Podcasts',
    youtube: 'YouTube',
    amazon: 'Amazon Music',
    podimo: 'Podimo'
  };
function sanitizeHtml(input) {
  const html = safeStr(input, '—');

  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  // Elimina tags peligrosas
  const blocked = tpl.content.querySelectorAll('script, style, iframe, object, embed, link, meta');
  blocked.forEach(n => n.remove());

  // Limpia atributos peligrosos (on*, javascript:)
  const all = tpl.content.querySelectorAll('*');
  all.forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').trim().toLowerCase();

      if (name.startsWith('on')) node.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) node.removeAttribute(attr.name);
    });

    // Si permites <a>, fuerza seguridad
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }
  });

  return tpl.innerHTML;
}

  // =========================
  // Helpers
  // =========================
  function safeStr(v, fallback = '') {
    if (v === null || v === undefined) return fallback;
    return String(v);
  }

  function clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function toTagsArray(tags) {
    if (Array.isArray(tags)) return tags;
    const s = safeStr(tags, '').trim();
    if (!s) return [];
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }

  function getCurrentPlatform() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch (e) {}

    const active = document.querySelector('.platform-selector .pchip.is-active');
    return active ? active.dataset.platform : 'ivoox';
  }

  function resolveChapterUrl(chapter, platform) {
    const links = (chapter && chapter.links) ? chapter.links : {};

    const wanted = (links[platform] || '').trim();
    if (wanted) return { url: wanted, used: platform };

    const fallback = (links.ivoox || '').trim();
    if (fallback) return { url: fallback, used: 'ivoox' };

    const first = Object.entries(links).find(([, u]) => (u || '').trim());
    if (first) return { url: String(first[1]).trim(), used: first[0] };

    return { url: '#', used: platform };
  }

  function getArc(data, arcId) {
    if (!data || !Array.isArray(data.arcs)) return null;
    const key = String(arcId).toLowerCase();
    return data.arcs.find(a => String(a.id).toLowerCase() === key) || null;
  }

  function sortChapters(chapters, orderMode) {
    const list = Array.isArray(chapters) ? [...chapters] : [];
    const mode = String(orderMode || '').toLowerCase();

    // Base: por "order" si existe; si no, mantiene orden de entrada
    list.sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));

    // Si es bottom_up, invertimos (empieza de abajo)
    if (mode.includes('bottom_up')) list.reverse();

    return list;
  }

  // =========================
  // Render LI (igual estructura/clases del HTML)
  // =========================
  function buildRouteStepLi(ch) {
    const chId = safeStr(ch.id);
    const kickerText = safeStr(ch.kicker || ('Capítulo ' + safeStr(ch.capNumber || '')));

    const li = el('li', 'route-step');

    const thumb = el('span', 'route-step__thumb');
    const img = document.createElement('img');
    img.src = safeStr(ch.thumb || '');
    img.alt = safeStr(ch.title || kickerText);
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.appendChild(img);

    const body = el('div', 'route-step__body');

    const kicker = el('div', 'route-step__kicker', kickerText);
    kicker.title = safeStr(ch.title || kickerText);
    body.appendChild(kicker);

    const descLines = Array.isArray(ch.descLines) ? ch.descLines : [];
    if (descLines[0]) body.appendChild(el('div', 'route-step__meta', safeStr(descLines[0])));
    if (descLines[1]) body.appendChild(el('div', 'route-step__meta', safeStr(descLines[1])));

    const actions = el('div', 'route-step__actions');
    actions.setAttribute('aria-label', 'Acciones');

    // Info
    const infoA = document.createElement('a');
    infoA.className = 'route-step__btn js-epinfo';
    infoA.href = '#';
    infoA.setAttribute('aria-label', 'Más info');
    infoA.title = 'Más info';
    infoA.dataset.ep = chId;

    const infoI = document.createElement('i');
    infoI.className = 'bi bi-info-circle';
    infoA.appendChild(infoI);

    // Play
    const playA = document.createElement('a');
    playA.className = 'route-step__btn route-step__btn--play js-epplay';
    playA.href = '#';
    playA.setAttribute('aria-label', 'Escuchar');
    playA.title = 'Escuchar';
    playA.dataset.ep = chId;

    const playI = document.createElement('i');
    playI.className = 'bi bi-play-fill';
    playA.appendChild(playI);

    actions.appendChild(infoA);
    actions.appendChild(playA);

    li.appendChild(thumb);
    li.appendChild(body);
    li.appendChild(actions);

    return li;
  }

  // =========================
  // Modal (Bootstrap)
  // =========================
  function setupModal(chaptersById) {
    const modalEl = document.getElementById('episodeInfoModal');
    if (!modalEl || !window.bootstrap || !window.bootstrap.Modal) return null;

    const titleEl = document.getElementById('episodeInfoTitle');
    const subEl   = document.getElementById('episodeInfoSubtitle');
    const durEl   = document.getElementById('episodeInfoDuration');
    const routeEl = document.getElementById('episodeInfoRoute');
    const hookEl  = document.getElementById('episodeInfoHook');
    const tagsEl  = document.getElementById('episodeInfoTags');
    const playBtn = document.getElementById('episodeInfoPlay');

    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);

    modalEl.addEventListener('show.bs.modal', function (evt) {
      const trigger = evt.relatedTarget;
      if (!trigger) return;

      const chId = safeStr(trigger.dataset.ep);
      const chObj = chaptersById[chId];

      if (!chObj) return;

      const info = chObj.info || {};
      const kickerText = safeStr(chObj.kicker || ('Capítulo ' + safeStr(chObj.capNumber || '')));

      if (titleEl) titleEl.textContent = safeStr(info.modalTitle || kickerText);
      if (subEl)   subEl.textContent   = safeStr(info.modalSubtitle || chObj.title || '');
      if (durEl)   durEl.textContent   = safeStr(info.duration || '—');
      if (routeEl) routeEl.textContent = safeStr(info.route || '—');
      if (hookEl) hookEl.innerHTML = sanitizeHtml(info.longDescription || '—');


      if (tagsEl) {
        tagsEl.innerHTML = '';
        toTagsArray(info.tags).forEach(t => {
          const span = document.createElement('span');
          span.className = 'badge';
          span.textContent = t;
          span.style.cssText =
            'background: rgba(255,255,255,.08);' +
            'border: 1px solid rgba(255,255,255,.14);' +
            'color: rgba(255,255,255,.88);';
          tagsEl.appendChild(span);
        });
      }

      const platform = getCurrentPlatform();
      const r = resolveChapterUrl(chObj, platform);

      if (playBtn) {
        playBtn.href = r.url;

        const span = playBtn.querySelector('span');
        if (span) {
          span.textContent = (r.url === '#')
            ? 'Enlace no disponible'
            : ('Abrir en ' + (labelMap[r.used] || r.used));
        }

        playBtn.title = (r.used !== platform)
          ? ('No disponible en ' + (labelMap[platform] || platform) + '. Abriendo ' + (labelMap[r.used] || r.used) + '.')
          : ('Abrir en ' + (labelMap[platform] || platform) + '.');

        if (r.url === '#') {
          playBtn.setAttribute('aria-disabled', 'true');
          playBtn.style.pointerEvents = 'none';
          playBtn.style.opacity = '.6';
        } else {
          playBtn.removeAttribute('aria-disabled');
          playBtn.style.pointerEvents = '';
          playBtn.style.opacity = '';
        }
      }
    });

    return modal;
  }

  // =========================
  // Init
  // =========================
  async function init() {
    // 1) localizar todos los <ol id="*-list">
    const lists = Array.from(document.querySelectorAll('ol[id$="-list"].route-steps'));
    if (!lists.length) return;

    // 2) requisito: vaciar todos al cargar
    lists.forEach(clearChildren);

    // 3) cargar JSON
    const jsonUrl =
      (document.documentElement?.dataset?.episodesJson)
        ? document.documentElement.dataset.episodesJson
        : DEFAULT_JSON_URL;

    let data;
    try {
      const res = await fetch(jsonUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } catch (err) {
      console.warn('[escuchas] No se pudo cargar JSON:', jsonUrl, err);
      return;
    }

    // 4) construir índice global de capítulos (para modal / play)
    const chaptersById = {};

    // 5) para cada <ol>, pintar arco correspondiente
    lists.forEach(ol => {
      const id = ol.id || '';
      const arcId = id.endsWith('-list') ? id.slice(0, -5) : id; // quita "-list"

      const arc = getArc(data, arcId);
      if (!arc) return;

      const chapters = sortChapters(arc.chapters, arc.orderMode);

      chapters.forEach(ch => {
        const chId = safeStr(ch.id);
        chaptersById[chId] = ch;
        ol.appendChild(buildRouteStepLi(ch));
      });
    });

    // 6) modal
    const modal = setupModal(chaptersById);

    // 7) eventos delegados: info y play
    document.addEventListener('click', function (e) {
      const info = e.target.closest('a.js-epinfo');
      if (info) {
        e.preventDefault();
        if (!modal) return;
        modal.show(info); // relatedTarget = info
        return;
      }

      const play = e.target.closest('a.js-epplay');
      if (play) {
        e.preventDefault();
        const chId = safeStr(play.dataset.ep);
        const chObj = chaptersById[chId];
        if (!chObj) return;

        const platform = getCurrentPlatform();
        const r = resolveChapterUrl(chObj, platform);
        if (r.url === '#') return;

        window.open(r.url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
