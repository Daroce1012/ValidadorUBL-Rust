/**
 * Punto de entrada principal de la aplicación unificada
 * Integra validador UBL y visualizador de facturas
 */

import { UnifiedAppController } from './app-controller.js';

// Inicializar la aplicación unificada
async function initializeApp() {
    const app = new UnifiedAppController();
    await app.initialize();
}

// Verificar si el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
