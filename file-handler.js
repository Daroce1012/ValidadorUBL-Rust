/**
 * Manejador de Archivos
 * Gestiona la carga y almacenamiento de archivos XML
 * Las validaciones de contenido se hacen en WebAssembly
 */
import { formatFileSize, isValidFileSize } from './utils.js';

export class FileHandler {
    constructor() {
        this.content = null;
    }

    // Procesa un archivo seleccionado
    handleFile(file, onSuccess, onError) {
        // Solo validaciones básicas - el contenido se valida en WebAssembly
        if (!file) return onError('No se pudo cargar el archivo.');
        if (!isValidFileSize(file, 10)) return onError('El archivo es demasiado grande. Máximo 10MB.');
        
        // Lectura del archivo
        const reader = new FileReader();
        reader.onload = (e) => {
            this.content = e.target.result;
            onSuccess(file, formatFileSize(file.size));
        };
        reader.onerror = () => onError('Error al leer el archivo.');
        reader.readAsText(file, 'UTF-8');
    }

    // Obtiene el contenido del archivo
    getLoadedContent() {
        return this.content;
    }

    // Limpia el archivo cargado
    clearFile() {
        this.content = null;
    }

    // Verifica si hay archivo cargado
    hasFile() {
        return this.content !== null;
    }
}
