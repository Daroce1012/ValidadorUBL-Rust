/**
 * Punto de entrada principal simplificado
 * Integra validador UBL y visualizador de facturas
 */

import { AppController } from './app-controller.js';

// Inicializar la aplicación
async function initializeApp() {
    const app = new AppController();
    await app.initialize();
}

// Verificar si el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
