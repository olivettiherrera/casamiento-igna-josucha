/**
 * Configuración del frontend.
 *
 * Mientras API_URL esté vacío, la web corre en MODO DEMO con datos
 * embebidos: sirve para ver el diseño y probar el flujo completo sin
 * haber tocado el Sheet todavía. Los aportes no se guardan en ningún lado.
 *
 * Cuando el Apps Script esté implementado:
 *   1. Pegá acá la URL que termina en /exec
 *   2. Pegá el api_token que imprimió setup() en el log
 */
window.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzeRGciz7uFmIabVKsJxoA8CCBtJkvYaH16RyGLZSWjQBtap2yUJR4LafqzA8y1pDAf/exec',
  API_TOKEN: '31c29482-8ac2-4f21-b3a7-88bc5dcbb78f',

  /** Fallback si el Sheet no responde o estamos en modo demo. */
  FALLBACK: {
    titulo_sitio: 'Igna & Josucha',
    alias: 'ignacio.olivetti.mp',
    cbu: '0000003100070262111040',
    titular: 'Ignacio Olivetti Y Herrera',
    banco: 'Mercado Pago',
    monto_minimo: '5000',
    mensaje_intro: 'Nos vamos de luna de miel a Japón y Filipinas. Si tenés ganas de regalarnos algo, elegí un pedacito del viaje y lo hacemos juntos.'
  }
};
