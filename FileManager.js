/**
 * FileManager - Gestión de archivos y estado de la aplicación
 * Maneja la carga, formateo y limpieza de archivos XML
 */
export class FileManager {
    constructor() {
        this.currentFile = null;
        this.xmlContent = null;
        this.validationResult = null;
        
        // Configuración
        this.config = {
            maxFileSize: 10 * 1024 * 1024 // 10MB
        };
    }

    // Inicializa el FileManager con configuración personalizada
    initialize(config = {}) {
        this.config = { ...this.config, ...config };
    }

    // Carga un archivo XML usando FileReader
    async loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.xmlContent = e.target.result;
                this.currentFile = file;
                resolve(e.target.result);
            };
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    // Formatea el tamaño de archivo en formato legible
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Limpia completamente el estado de archivos
    clearAll() {
        this.currentFile = null;
        this.xmlContent = null;
        this.validationResult = null;
    }

    // Limpia solo el resultado de validación (mantiene archivo y contenido)
    clearValidation() {
        this.validationResult = null;
    }

    // Obtiene el contenido XML actual
    getXMLContent() {
        return this.xmlContent;
    }

    // Valida un archivo antes de cargarlo
    validateFile(file) {
        if (!file) {
            return {
                isValid: false,
                error: 'No se proporcionó archivo'
            };
        }

        if (file.size > this.config.maxFileSize) {
            return {
                isValid: false,
                error: `El archivo es demasiado grande. Máximo ${this.formatFileSize(this.config.maxFileSize)}`
            };
        }

        if (!file.type.includes('xml') && !file.name.endsWith('.xml')) {
            return {
                isValid: false,
                error: 'El archivo debe ser XML'
            };
        }

        return {
            isValid: true,
            error: null
        };
    }

    // Establece el resultado de validación
    setValidationResult(result) {
        this.validationResult = result;
    }

    // Obtiene el resultado de validación actual
    getValidationResult() {
        return this.validationResult;
    }
}