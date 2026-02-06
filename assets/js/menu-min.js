
  // Toggle menú móvil
  const mobileBtn = document.querySelector('.mobile-nav-toggle');
  const body = document.body;

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      body.classList.toggle('mobile-nav-active');
      mobileBtn.classList.toggle('bi-list');
      mobileBtn.classList.toggle('bi-x');
    });
  }

  // Dropdowns en móvil
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (body.classList.contains('mobile-nav-active')) {
        e.preventDefault();
        const parent = el.closest('.dropdown');
        const dropdown = parent ? parent.querySelector('ul') : null;
        if (dropdown) dropdown.classList.toggle('dropdown-active');
        el.classList.toggle('rotated');
      }
    });
  });