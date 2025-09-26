/**
 * Utilidades del Validador UBL
 * Funciones auxiliares y sistema de logging
 */

// Formatea el tamaño de archivo en formato legible
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Valida el tamaño del archivo
export function isValidFileSize(file, maxSizeInMB = 10) {
    if (!file) return false;
    return file.size <= maxSizeInMB * 1024 * 1024;
}

// Delay para efectos visuales
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Sistema de logging
export class Logger {
    static error(message, ...args) {
        console.error(message, ...args);
    }
    
    static warn(message, ...args) {
        console.warn(message, ...args);
    }
    
    static info(message, ...args) {
        console.info(message, ...args);
    }
    
    static debug(message, ...args) {
        console.log(message, ...args);
    }
}