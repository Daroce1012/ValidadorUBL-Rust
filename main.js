/**
 * Punto de entrada principal de la aplicación
 * Inicializa y arranca el Validador UBL
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