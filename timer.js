/**
 * Clase simple para medir tiempo de cualquier operación
 * Usa Temporal API con polyfill para mayor precisión
 */
export class Timer {
    constructor(nombreOperacion) {
        this.nombreOperacion = nombreOperacion;
        this.inicio = null;
        this.usarTemporal = this.detectarTemporal();
    }

    // Detecta si el navegador soporta Temporal API
    detectarTemporal() {
        try {
            return typeof Temporal !== 'undefined' && Temporal.Now && Temporal.Now.instant;
        } catch {
            return false;
        }
    }

    // Inicia la medición
    start() {
        try {
            if (this.usarTemporal) {
                this.inicio = Temporal.Now.instant();
                console.log(`🕐 Iniciando: ${this.nombreOperacion} (Temporal API)`);
            } else {
                this.inicio = new Date();
                console.log(`🕐 Iniciando: ${this.nombreOperacion} (Date API)`);
            }
        } catch (error) {
            // Fallback final a Date
            this.inicio = new Date();
            console.log(`🕐 Iniciando: ${this.nombreOperacion} (Date API - Fallback)`);
        }
    }

    // Termina la medición y muestra el resultado
    end() {
        if (!this.inicio) {
            throw new Error('Debes llamar start() primero');
        }
        
        let fin;
        let tiempoMs;
        let apiUsada;

        try {
            if (this.usarTemporal) {
                fin = Temporal.Now.instant();
                const duracion = fin.since(this.inicio);
                tiempoMs = duracion.total({ unit: 'millisecond' });
                apiUsada = 'Temporal';
            } else {
                fin = new Date();
                tiempoMs = fin.getTime() - this.inicio.getTime();
                apiUsada = 'Date';
            }
        } catch (error) {
            // Fallback final a Date
            fin = new Date();
            tiempoMs = fin.getTime() - this.inicio.getTime();
            apiUsada = 'Date';
        }

        const tiempoSegundos = (tiempoMs / 1000).toFixed(3);
        
        console.log(`✅ ${this.nombreOperacion} completado en ${tiempoSegundos} segundos (${apiUsada} API)`);
        
        return {
            tiempoMs: tiempoMs,
            tiempoSegundos: tiempoSegundos,
            apiUsada: apiUsada
        };
    }

    // Termina la medición cuando hay error
    endWithError(error) {
        const resultado = this.end();
        console.error(`❌ ${this.nombreOperacion} falló después de ${resultado.tiempoSegundos} segundos:`, error);
        return resultado;
    }
}

