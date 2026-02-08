(function () {
  // =========================
  // Config
  // =========================
  const STORAGE_KEY = 'ltp_platform';
  const DEFAULT_JSON_URL = '../../assets/data/e-cinematografico.json';

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
    // Dentro de sanitizeHtml(), reemplaza el bloque de <a> por este:
    if (node.tagName === 'A') {
      const isOwn = node.classList.contains('own-link');

      if (isOwn) {
        node.removeAttribute('target');     // misma pestaña
        node.removeAttribute('rel');
      } else {
        node.setAttribute('target', '_blank');            // nueva pestaña
        node.setAttribute('rel', 'noopener noreferrer');
      }
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
    const prem = isPremiereLocked(chapter);
    if (prem.locked) {
      return { url: '#', used: platform, locked: true, premiereDate: prem.date };
    }

    const links = (chapter && chapter.links) ? chapter.links : {};

    const wanted = (links[platform] || '').trim();
    if (wanted) return { url: wanted, used: platform, locked: false, premiereDate: null };

    const fallback = (links.ivoox || '').trim();
    if (fallback) return { url: fallback, used: 'ivoox', locked: false, premiereDate: null };

    const first = Object.entries(links).find(([, u]) => (u || '').trim());
    if (first) return { url: String(first[1]).trim(), used: first[0], locked: false, premiereDate: null };

    return { url: '#', used: platform, locked: false, premiereDate: null };
  }

  function getArc(data, arcId) {
    if (!data || !Array.isArray(data.arcs)) return null;
    const key = String(arcId).toLowerCase();
    return data.arcs.find(a => String(a.id).toLowerCase() === key) || null;
  }

  function sortChapters(chapters, orderMode) {
    const list = Array.isArray(chapters) ? [...chapters] : [];
    const mode = String(orderMode || '').toLowerCase();

    // Orden por "order" si existe
    list.sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));

    // bottom_up => invertir
    if (mode.includes('bottom_up')) list.reverse();

    return list;
  }


  // =========================
  // Pre-estreno (opcional)
  // - Si existe ch.premiere.at o ch.premiereAt y la fecha es futura:
  //   - el LI se renderiza en modo "pre-estreno"
  //   - el botón de escuchar queda deshabilitado hasta la fecha
  // =========================
  function getPremiereAtRaw(ch) {
    if (!ch) return '';
    if (ch.premiere && typeof ch.premiere === 'object') {
      return safeStr(ch.premiere.at || ch.premiere.date || '');
    }
    // Compatibilidad: permite nombres alternativos
    return safeStr(
      ch.premiereAt ||
      ch.preEstrenoAt ||
      ch.preestrenoAt ||
      ch.preEstreno ||
      ch.preestreno ||
      ''
    );
  }

  function getPremiereLabel(ch) {
    if (!ch) return 'Estreno';
    if (ch.premiere && typeof ch.premiere === 'object' && ch.premiere.label) {
      return safeStr(ch.premiere.label, 'Estreno');
    }
    return safeStr(ch.premiereLabel || ch.preEstrenoLabel || 'Estreno');
  }

  function parsePremiereDate(raw) {
    const s = safeStr(raw, '').trim();
    if (!s) return null;

    // Recomendado: ISO 8601 con zona horaria, ej:
    // 2026-02-10T20:00:00+01:00
    const d = new Date(s);
    if (!isFinite(d.getTime())) return null;
    return d;
  }

  function isPremiereLocked(ch, nowMs = Date.now()) {
    const d = parsePremiereDate(getPremiereAtRaw(ch));
    if (!d) return { locked: false, date: null };
    return { locked: (nowMs < d.getTime()), date: d };
  }

function formatPremiereDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",

    // Si quieres forzar Madrid, descomenta:
    timeZone: "Europe/Madrid",
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}



  // =========================
  // Render LI (estructura compatible con tu CSS)
  // =========================
  function buildRouteStepLi(ch) {
    const chId = safeStr(ch && ch.id);
    const kickerText = safeStr(ch && (ch.kicker || ('Capítulo ' + safeStr(ch.capNumber || ''))));

    const li = el('li', 'route-step');

    const prem = isPremiereLocked(ch);
    if (prem.locked) li.classList.add('route-step--premiere');

    if (ch && ch.highlightBorderColor) {
      li.style.borderColor = ch.highlightBorderColor;
    }

    const thumb = el('span', 'route-step__thumb');
    const img = document.createElement('img');
    img.src = safeStr(ch && ch.thumb || '');
    img.alt = safeStr(ch && (ch.title || kickerText));
    img.loading = 'lazy';
    img.decoding = 'async';
    thumb.appendChild(img);

    const body = el('div', 'route-step__body');

    const kicker = el('div', 'route-step__kicker', kickerText);
    kicker.title = safeStr(ch && (ch.title || kickerText));
    body.appendChild(kicker);

    // Aviso de pre-estreno (si procede)
    if (prem.locked && prem.date) {
      const label = getPremiereLabel(ch);
      const when = formatPremiereDate(prem.date);
      const note = el('div', 'route-step__meta', label + ' ' + when);
      note.setAttribute('data-premiere', 'true');
      body.appendChild(note);
    }

    // meta: en cine hay casos con HTML <p>... (en tu HTML original)
    // Para mantener simplicidad: usamos 1-2 líneas (descLines).
    const descLines = Array.isArray(ch && ch.descLines) ? ch.descLines : [];
    if (!(prem.locked && prem.date)) {
        if (descLines[0]) body.appendChild(el('div', 'route-step__meta', safeStr(descLines[0])));
        if (descLines[1]) body.appendChild(el('div', 'route-step__meta', safeStr(descLines[1])));
    }
    const actions = el('div', 'route-step__actions');
    actions.setAttribute('aria-label', 'Acciones');

    const infoA = document.createElement('a');
    infoA.className = 'route-step__btn js-epinfo';
    infoA.href = '#';
    infoA.setAttribute('aria-label', 'Más info');
    infoA.title = 'Más info';
    infoA.dataset.ep = chId;

    const infoI = document.createElement('i');
    infoI.className = 'bi bi-info-circle';
    infoA.appendChild(infoI);

    const playA = document.createElement('a');
    playA.className = 'route-step__btn route-step__btn--play js-epplay';
    playA.href = '#';
    playA.setAttribute('aria-label', 'Escuchar');
    playA.title = 'Escuchar';
    playA.dataset.ep = chId;

    const playI = document.createElement('i');
    playI.className = 'bi bi-play-fill';
    playA.appendChild(playI);

    // Si está en pre-estreno: deshabilita el botón de escuchar
    if (prem.locked && prem.date) {
      const label = getPremiereLabel(ch);
      const when = formatPremiereDate(prem.date);

      playA.setAttribute('aria-label', 'Próximamente');
      playA.setAttribute('aria-disabled', 'true');
      playA.style.pointerEvents = 'none';
      playA.style.opacity = '.6';
      playA.title = label + ' Disponible el ' + when;

      playI.className = 'bi bi-clock';
    }

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
      const prem = isPremiereLocked(chObj);

      if (hookEl) {
        hookEl.innerHTML = '';

        if (prem.locked && prem.date) {
          const box = document.createElement('div');
          box.textContent = getPremiereLabel(chObj) + ': disponible el ' + formatPremiereDate(prem.date);
          box.style.cssText =
            'margin-bottom:10px;' +
            'padding:10px 12px;' +
            'border:1px solid rgba(255,255,255,.14);' +
            'border-radius:12px;' +
            'background:rgba(255,255,255,.06);' +
            'font-weight:700;';
          hookEl.appendChild(box);
        }

        const desc = document.createElement('div');
        desc.innerHTML = sanitizeHtml(info.longDescription || '—');
        hookEl.appendChild(desc);
      }

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
          if (r.locked && r.premiereDate) {
            span.textContent = 'Disponible el ' + formatPremiereDate(r.premiereDate);
          } else if (r.url === '#') {
            span.textContent = 'Enlace no disponible';
          } else {
            span.textContent = 'Abrir en ' + (labelMap[r.used] || r.used);
          }
        }

        if (r.locked && r.premiereDate) {
          playBtn.title = getPremiereLabel(chObj) + ': disponible el ' + formatPremiereDate(r.premiereDate);
        } else {
          playBtn.title = (r.used !== platform)
            ? ('No disponible en ' + (labelMap[platform] || platform) + '. Abriendo ' + (labelMap[r.used] || r.used) + '.')
            : ('Abrir en ' + (labelMap[platform] || platform) + '.');
        }

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
    const lists = Array.from(document.querySelectorAll('ol[id$="-list"].route-steps'));
    if (!lists.length) return;

    // requisito: vaciar todos al cargar
    lists.forEach(clearChildren);

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
      console.warn('[escuchas-cine] No se pudo cargar JSON:', jsonUrl, err);
      return;
    }

    const chaptersById = {};

    lists.forEach(ol => {
      const arcId = (ol.id || '').endsWith('-list') ? ol.id.slice(0, -5) : (ol.id || '');
      if (!arcId) return;

      const arc = getArc(data, arcId);
      if (!arc) return;

      const chapters = sortChapters(arc.chapters, arc.orderMode);

      chapters.forEach(ch => {
        const chId = safeStr(ch.id);
        chaptersById[chId] = ch;
        ol.appendChild(buildRouteStepLi(ch));
      });
    });

    const modal = setupModal(chaptersById);

    document.addEventListener('click', function (e) {
      const info = e.target.closest('a.js-epinfo');
      if (info) {
        e.preventDefault();
        if (!modal) return;
        modal.show(info);
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
