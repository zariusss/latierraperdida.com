
  (function () {

    const root = document.documentElement;
    const body = document.body;
    const bar = document.getElementById('readerProgressBar');

    // --- Preferencias (localStorage) ---
    const LS = {
      theme: 'ltp_reader_theme',
      font: 'ltp_reader_font',
      wide: 'ltp_reader_wide'
    };

    function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

    function applyTheme(theme){
      body.classList.toggle('reader-theme-light', theme === 'light');
      localStorage.setItem(LS.theme, theme);
    }

    function applyFont(px){
      const size = clamp(px, 16, 22);
      body.style.setProperty('--reader-font-size', size + 'px');
      localStorage.setItem(LS.font, String(size));
    }

    function applyWide(isWide){
      body.classList.toggle('reader-wide', !!isWide);
      localStorage.setItem(LS.wide, isWide ? '1' : '0');
    }

    // Load saved prefs
    applyTheme(localStorage.getItem(LS.theme) || 'dark');
    applyFont(parseInt(localStorage.getItem(LS.font) || '18', 10));
    applyWide((localStorage.getItem(LS.wide) || '0') === '1');

    // --- Controles ---
    document.getElementById('toggleTheme')?.addEventListener('click', () => {
      const next = body.classList.contains('reader-theme-light') ? 'dark' : 'light';
      applyTheme(next);
    });

    document.getElementById('incFont')?.addEventListener('click', () => {
      const current = parseInt(getComputedStyle(body).getPropertyValue('--reader-font-size'), 10) || 18;
      applyFont(current + 1);
      updateReadingTime();
    });

    document.getElementById('decFont')?.addEventListener('click', () => {
      const current = parseInt(getComputedStyle(body).getPropertyValue('--reader-font-size'), 10) || 18;
      applyFont(current - 1);
      updateReadingTime();
    });

    document.getElementById('toggleWidth')?.addEventListener('click', () => {
      applyWide(!body.classList.contains('reader-wide'));
    });

    // --- Tiempo de lectura (estimación) ---
    function updateReadingTime(){
      const article = document.getElementById('readerArticle');
      const out = document.getElementById('readingTime');
      if(!article || !out) return;

      const text = article.innerText || '';
      const words = (text.trim().match(/\S+/g) || []).length;
      const wpm = 220; // lectura media
      const mins = Math.max(1, Math.round(words / wpm));
      out.textContent = 'Tiempo de lectura: ' + mins + ' min';
    }
    updateReadingTime();

    // --- Header height dinámico para que la toolbar no se meta debajo ---
    const header = document.getElementById('header');

    function setHeaderHeight(){
      if(!header) return;
      if (body.classList.contains('reader-header-hidden')) {
        root.style.setProperty('--header-h', '0px');
        return;
      }
      const h = Math.ceil(header.getBoundingClientRect().height);
      root.style.setProperty('--header-h', h + 'px');
    }

    window.addEventListener('load', setHeaderHeight);
    window.addEventListener('resize', setHeaderHeight);

    if (header && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => setHeaderHeight());
      ro.observe(header);
    }
    setHeaderHeight();

    // --- Progreso + Auto-hide header (un solo scroll listener) ---
    let ticking = false;
    let lastY = window.scrollY || 0;

    const SHOW_DELTA = 12;   // sensibilidad
    const HIDE_AFTER = 150;  // px antes de permitir ocultar

    function onScroll(){

      if(ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        // 1) Progreso
        if (bar) {
          const doc = document.documentElement;
          const scrollTop = doc.scrollTop || document.body.scrollTop;
          const scrollHeight = doc.scrollHeight - doc.clientHeight;
          const p = scrollHeight > 0 ? (scrollTop / scrollHeight) : 0;
          bar.style.width = (p * 100).toFixed(2) + '%';
        }

        // 2) Ocultar/mostrar header
        const y = window.scrollY || 0;
        const goingDown = y > lastY + SHOW_DELTA;
        const goingUp   = y < lastY - SHOW_DELTA;

        if (header) {
          if (y > HIDE_AFTER && goingDown) {
            if (!body.classList.contains('reader-header-hidden')) {
              body.classList.add('reader-header-hidden');
              root.style.setProperty('--header-h', '0px');
            }
          } else if (goingUp) {
            if (body.classList.contains('reader-header-hidden')) {
              body.classList.remove('reader-header-hidden');
              setHeaderHeight();
            }
          }
        }

        lastY = y;
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    //  --- Botón de vuelta atrás (CORREGIDO) ---
    const a = document.getElementById('btnBack');
    if (a) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
          return; // <-- clave para que NO redirija siempre
        }
        window.location.href = "../../index.html";
      });
    }

  })();
