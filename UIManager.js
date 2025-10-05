/**
 * UIManager - Gestión de interfaz de usuario y eventos
 * Maneja la visualización, eventos y utilidades de UI
 */
export class UIManager {
    constructor(elements) {
        this.elements = elements;
        this.appController = null; // Se asignará en initialize()
        this.fileManager = null; // Referencia al FileManager para usar formatFileSize
    }

    // Inicializa el UIManager con referencia al AppController
    initialize(appController) {
        this.appController = appController;
        this.fileManager = appController.fileManager; // Obtener referencia al FileManager
        this.setupUploadAreaEvents();
        this.setupFileInputEvents();
        this.setupButtonEvents();
        this.setupGlobalFunctions();
    }

    // Muestra una página específica
    showPage(pageId) {
        this.togglePage(pageId, true);
    }

    // Oculta una página específica
    hidePage(pageId) {
        this.togglePage(pageId, false);
    }

    // Alterna la visibilidad de una página
    togglePage(pageId, show) {
        const pageElement = this.elements[pageId + 'Page'];
        if (!pageElement) return;
        
        pageElement.style.display = show ? 'block' : 'none';
        pageElement.classList.toggle('hidden', !show);
    }

    // Alterna la visibilidad de un elemento
    toggleElement(elementId, show) {
        const element = this.elements[elementId];
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    // Muestra información del archivo
    showFileInfo(fileName, fileSize) {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = fileName;
        }
        if (this.elements.fileSize) {
            this.elements.fileSize.textContent = fileSize;
        }
    }

    // Oculta la información del archivo
    hideFileInfo() {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = '';
        }
        if (this.elements.fileSize) {
            this.elements.fileSize.textContent = '';
        }
    }

    // Muestra el resultado de una operación
    showResult(message, type) {
        if (this.elements.validationResult) {
            this.elements.validationResult.textContent = message;
            this.elements.validationResult.className = `result ${type}`;
            this.elements.validationResult.style.display = 'block';
        }
    }

    // Oculta el resultado de una operación
    hideResult() {
        if (this.elements.validationResult) {
            this.elements.validationResult.style.display = 'none';
        }
    }

    // Muestra la vista previa del archivo
    showFilePreview() {
        this.toggleElement('filePreview', true);
    }

    // Oculta la vista previa del archivo
    hideFilePreview() {
        this.toggleElement('filePreview', false);
    }

    // Actualiza el estado del botón de visualización
    updateVisualizationButtonState() {
        if (this.elements.visualizeBtn) {
            this.elements.visualizeBtn.disabled = false;
        }
    }

    // Habilita el área de carga
    enableUploadArea() {
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.pointerEvents = 'auto';
            this.elements.uploadArea.style.opacity = '1';
        }
    }

    // Deshabilita el área de carga
    disableUploadArea() {
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.pointerEvents = 'none';
            this.elements.uploadArea.style.opacity = '0.5';
        }
    }

    // Configura eventos del área de carga
    setupUploadAreaEvents() {
        if (!this.elements.uploadArea) return;

        // Drag and drop events
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('drag-over');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('drag-over');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Click event
        this.elements.uploadArea.addEventListener('click', () => {
            if (this.elements.fileInput) {
                this.elements.fileInput.click();
            }
        });
    }

    // Configura eventos del input de archivo
    setupFileInputEvents() {
        if (!this.elements.fileInput) return;

        this.elements.fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    // Configura eventos de botones
    setupButtonEvents() {
        // Botón de validación
        if (this.elements.validateBtn) {
            this.elements.validateBtn.addEventListener('click', () => {
                this.validateDocument();
            });
        }

        // Botón de visualización
        if (this.elements.visualizeBtn) {
            this.elements.visualizeBtn.addEventListener('click', () => {
                this.visualizeDocument();
            });
        }

        // Botón de PDF
        if (this.elements.downloadPdfBtn) {
            this.elements.downloadPdfBtn.addEventListener('click', () => {
                this.generatePDF();
            });
        }

        // Botón de reintentar
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => {
                this.retryUpload();
            });
        }

        // Botón de cambiar archivo
        if (this.elements.changeFileBtn) {
            this.elements.changeFileBtn.addEventListener('click', () => {
                this.changeFile();
            });
        }

        // Botón de cerrar/volver
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.goToUploadPage();
            });
        }
    }

    // Configura funciones globales
    setupGlobalFunctions() {
        // Hacer funciones disponibles globalmente
        window.handleFileSelect = (file) => this.handleFileSelect(file);
        window.validateDocument = () => this.validateDocument();
        window.visualizeDocument = () => this.visualizeDocument();
        window.generatePDF = () => this.generatePDF();
        window.retryUpload = () => this.retryUpload();
        window.changeFile = () => this.changeFile();
    }

    // Formatea el tamaño de archivo usando FileManager
    formatFileSize(bytes) {
        return this.fileManager ? this.fileManager.formatFileSize(bytes) : '0 Bytes';
    }

    // Extrae mensaje de error de un objeto Error
    extractErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.toString) return error.toString();
        return 'Error desconocido';
    }

    // Inicia el estado de procesamiento
    startProcessing(message) {
        // Deshabilitar botones durante procesamiento
        if (this.elements.validateBtn) this.elements.validateBtn.disabled = true;
        if (this.elements.visualizeBtn) this.elements.visualizeBtn.disabled = true;
        if (this.elements.downloadPdfBtn) this.elements.downloadPdfBtn.disabled = true;
        
        this.showResult(message, 'loading');
    }

    // Finaliza el estado de procesamiento
    endProcessing() {
        // Rehabilitar botones después del procesamiento
        if (this.elements.validateBtn) this.elements.validateBtn.disabled = false;
        if (this.elements.visualizeBtn) this.elements.visualizeBtn.disabled = false;
        if (this.elements.downloadPdfBtn) this.elements.downloadPdfBtn.disabled = false;
    }

    // Actualiza el estado del botón de visualización
    updateVisualizationButtonState(isValid) {
        const visualizeBtn = this.elements.visualizeBtn;
        if (!visualizeBtn) return;
        
        visualizeBtn.disabled = !isValid;
        visualizeBtn.classList.toggle('disabled', !isValid);
        visualizeBtn.title = isValid
            ? 'Visualizar factura validada'
            : 'Primero debes validar el documento exitosamente';
    }

    // Limpia completamente la interfaz de usuario (solo elementos, no vistas)
    clearUI() {
        this.hideFileInfo();
        this.hideResult();
        this.hideFilePreview();
    }

    // Cambia a la vista de carga
    goToUploadView() {
        this.showPage('upload');
        this.hidePage('visualization');
    }

    // Cambia a la vista de visualización
    goToVisualizationView() {
        this.showPage('visualization');
        this.hidePage('upload');
    }

    // ==================== MÉTODOS DELEGADOS AL APPCONTROLLER ====================

    // Maneja la selección de archivo
    handleFileSelect(file) {
        if (this.appController) {
            this.appController.handleFileSelect(file);
        }
    }

    // Valida el documento
    validateDocument() {
        if (this.appController) {
            this.appController.validateDocument();
        }
    }

    // Visualiza el documento
    visualizeDocument() {
        if (this.appController) {
            this.appController.visualizeDocument();
        }
    }

    // Genera PDF
    generatePDF() {
        if (this.appController) {
            this.appController.downloadPDF();
        }
    }

    // Reintenta la carga
    retryUpload() {
        if (this.appController) {
            this.appController.retryUpload();
        }
    }

    // Cambia el archivo
    changeFile() {
        if (this.appController) {
            this.appController.changeFile();
        }
    }

    // Va a la página de carga
    goToUploadPage() {
        if (this.appController) {
            this.appController.goToUploadPage();
        }
    }
}