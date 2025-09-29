/**
 * Validador UBL
 * Maneja la validación de documentos UBL usando WebAssembly
 */
import init, { validar_ubl } from './rust/wasm-output/validador_ubl.js';
import { delay, Logger } from './utils.js';

export class UBLValidator {
    constructor() {
        this.wasm = null;
        this.ready = false;
    }

    // Inicializa el validador WebAssembly
    async initialize() {
        try {
            this.wasm = await init();
            this.ready = true;
            Logger.info('✅ Validador UBL inicializado');
        } catch (error) {
            Logger.error('❌ Error inicializando WebAssembly:', error);
            throw error;
        }
    }

    // Valida un documento UBL
    async validate(content, onResult) {
        if (!this.ready) return onResult('Validador cargando...', 'warning');
        if (!content) return onResult('Carga un archivo XML UBL para validar.', 'warning');
        
        try {
            await delay(300);
            const resultado = validar_ubl(content);
            
            if (resultado === 'Válido') {
                onResult('✅ Documento válido: Cumple con todos los requisitos UBL', 'success');
            } else {
                onResult(`❌ Documento inválido: ${resultado}`, 'error');
            }
            
        } catch (error) {
            Logger.error('Error durante la validación:', error);
            onResult(`⚠️ Error inesperado: ${error.message || error}`, 'error');
        }
    }
}
