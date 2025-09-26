/**
 * Gestor de la Interfaz de Usuario
 * Maneja todos los elementos del DOM y sus interacciones
 */
export class DOMManager {
    constructor() {
        this.elements = this._getElements();
    }

    // Obtiene referencias a los elementos del DOM
    _getElements() {
        return {
            fileInput: document.getElementById('fileInput'),
            fileUploadArea: document.getElementById('fileUploadArea'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            button: document.querySelector('.button'),
            result: document.getElementById('resultado')
        };
    }

    // Configura los eventos de la interfaz
    setupEventListeners(onFileSelect) {
        // Click en área de carga
        this.elements.fileUploadArea.addEventListener('click', (e) => {
            if (e.target !== this.elements.fileInput) {
                this.elements.fileInput.click();
            }
        });

        // Selección de archivo
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
        });
    }

    // Muestra resultado de validación
    showResult(message, type) {
        const { result } = this.elements;
        result.textContent = message;
        result.className = `result ${type}`;
        result.style.display = 'block';
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Oculta resultado
    hideResult() {
        this.elements.result.style.display = 'none';
    }

    // Controla estado del botón de validación
    setButtonState(loading) {
        const { button } = this.elements;
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span>Validando...';
        } else {
            button.disabled = false;
            button.textContent = 'Validar Documento';
        }
    }

    // Muestra información del archivo cargado
    showFileInfo(fileName, fileSize) {
        this.elements.fileName.textContent = `${fileName} (${fileSize})`;
        this.elements.fileInfo.style.display = 'flex';
    }

    // Oculta información del archivo
    hideFileInfo() {
        this.elements.fileInfo.style.display = 'none';
    }

    // Limpia el input de archivo
    clearFileInput() {
        this.elements.fileInput.value = '';
    }
}
