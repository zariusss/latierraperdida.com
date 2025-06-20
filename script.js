
// Función para mostrar el banner si no se ha dado consentimiento
function showCookieBanner() {
    const consent = localStorage.getItem('cookieConsent');
    console.log('cookieConsent=' + consent)
    if (!consent) {
        document.getElementById('cookie-banner').style.display = 'block';
    }
}

// Función para aceptar cookies
function acceptCookies() {
    // Guardar consentimiento
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());

    // Ocultar banner
    document.getElementById('cookie-banner').style.display = 'none';

    // Activar Google Analytics
    enableGoogleAnalytics();

    console.log('Cookies aceptadas');
}

// Función para rechazar cookies no esenciales
function rejectCookies() {
    // Guardar rechazo
    localStorage.setItem('cookieConsent', 'rejected');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());

    // Ocultar banner
    document.getElementById('cookie-banner').style.display = 'none';

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

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar banner si es necesario
    showCookieBanner();

    // Si ya se aceptaron las cookies, activar GA inmediatamente
    if (areCookiesAccepted()) {
        enableGoogleAnalytics();
    }
});

// Función opcional para resetear el consentimiento (para testing)
function resetCookieConsent() {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieConsentDate');
    location.reload();
}