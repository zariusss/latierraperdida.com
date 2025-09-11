
// Función para mostrar el banner si no se ha dado consentimiento
function showCookieBanner() {
    const consent = localStorage.getItem('cookieConsent');
    const country = localStorage.getItem('country');

    console.log('cookieConsent=' + consent + '; country=' + country);

    if (consent===null || country===null) {
        document.getElementById('countryModal').style.display = 'block';
    }
}

// Función para aceptar cookies
function acceptCookies() {

    const checkbox = document.getElementById('cookieCheckbox');

    if (checkbox && checkbox.checked) {
      console.log('El usuario ha aceptado el uso de cookies.');
      // Guardar consentimiento
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());

      // Ocultar banner
//      document.getElementById('cookie-banner').style.display = 'none';

      // Activar Google Analytics
      enableGoogleAnalytics();
    } else {
      rejectCookies()
      console.log('El usuario NO ha aceptado el uso de cookies.');
    }
}

// Función para rechazar cookies no esenciales
function rejectCookies() {
    // Guardar rechazo
    localStorage.setItem('cookieConsent', 'rejected');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());

    // Ocultar banner
//    document.getElementById('cookie-banner').style.display = 'none';

    // NO activar Google Analytics
    disableGoogleAnalytics();

    console.log('Cookies rechazadas - Solo esenciales');
}

// Función para activar Google Analytics
function enableGoogleAnalytics() {

    const GA_ID = 'G-PMTQEQV0HZ';

    // Crear y cargar el script de Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Configurar gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_ID, {
        'anonymize_ip': true,
        'cookie_flags': 'SameSite=None;Secure'
    });

    console.log('Google Analytics activado');
}

// Función para desactivar Google Analytics
function disableGoogleAnalytics() {
    // Desactivar gtag si existe
    if (window.gtag) {
        window.gtag('consent', 'update', {
            'analytics_storage': 'denied'
        });
    }

    // Borrar cookies de GA existentes
    const gaCookies = ['_ga', '_ga_', '_gid', '_gat'];
    gaCookies.forEach(cookie => {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    console.log('Google Analytics desactivado');
}

// Función para verificar si las cookies están aceptadas
function areCookiesAccepted() {
    return localStorage.getItem('cookieConsent') === 'accepted';
}

(function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run(); // El DOM ya está listo
  }

  function run() {
    showCookieBanner();
    if (areCookiesAccepted()) {
      enableGoogleAnalytics();
    }
  }
})();

// Función opcional para resetear el consentimiento (para testing)
function resetCookieConsent() {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieConsentDate');
    location.reload();
}


function selectCountry(code) {
  localStorage.setItem('country', code);
  document.getElementById('countryModal').style.display = 'none';
  acceptCookies();
}

// Opcional: si ya hay país seleccionado, ocultar el modal al cargar
window.onload = () => {
  if (localStorage.getItem('country')) {
    document.getElementById('countryModal').style.display = 'none';
  }
};

// Matriz de países con su URL base
const paises = [
  { codigo: 'ES', baseUrl: 'https://www.amazon.es/' },
  { codigo: 'MX', baseUrl: 'https://www.amazon.com/' },
  { codigo: 'OTHER', baseUrl: 'https://www.amazon.com/' }
];

// Matriz de productos con su ruta
//https://www.amazon.com.mx/dp/B0FHQCH9GP/ref=cbw_us_mx_dp_narx_gl_book
//https://www.amazon.com/dp/B0F286H12V
const productos = [
  { nombre: 'novela', path: 'dp/B0F286H12V' },
  { nombre: 'novela-fisica', path: 'dp/B0FHQCH9GP' },
  { nombre: 'ecos', path: 'gp/product/B0DWK97P98' },
  { nombre: 'piloto', path: 'gp/product/B0DXC3GP39' },
  { nombre: 'erik', path: 'gp/product/B0F3XXGD7G' },
  { nombre: 'piloto2', path: 'dp/B0FCXZTCYQ' }
];

// Función que construye la URL
function obtenerUrlProducto(nombreProducto, codigoPais) {
  const pais = paises.find(p => p.codigo === codigoPais);
  const producto = productos.find(p => p.nombre === nombreProducto);

  if (!pais || !producto) return null;

  // Concatenamos con cuidado de los slashes
  return pais.baseUrl.replace(/\/+$/, '') + '/' + producto.path.replace(/^\/+/, '');
}

document.querySelectorAll('.producto-enlace').forEach(enlace => {
  enlace.addEventListener('click', function(event) {
    event.preventDefault();

    const pais = localStorage.getItem('country');
    const producto = this.dataset.prod;

    const url = obtenerUrlProducto(producto, pais);

    if (url) {
      // 🔹 Enviar evento a Google Analytics
      gtag('event', 'click_amazon', {
        event_category: 'Outbound',
        event_label: url,
        country: pais,
        product: producto,
        transport_type: 'beacon'
      });
      window.open(url, '_blank');
    } else {
      alert('URL no disponible para esta combinación.');
    }
  });
});
