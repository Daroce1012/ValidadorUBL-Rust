/**
 * Gestor de la Interfaz de Usuario Unificada
 * Maneja todos los elementos del DOM y sus interacciones para la aplicación unificada
 */
export class UnifiedDOMManager {
    constructor() {
        this.elements = this._getElements();
        this._validateElements();
    }

    // Valida que todos los elementos necesarios estén presentes
    _validateElements() {
        const requiredElements = [
            'fileInput', 'fileUploadArea', 'fileName', 'filePreview',
            'validationResult', 'errorSection', 'uploadPage', 'visualizationPage'
        ];

        const missingElements = requiredElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Elementos del DOM faltantes:', missingElements);
        }
    }

    // Obtiene referencias a los elementos del DOM
    _getElements() {
        const elements = {
            fileInput: document.getElementById('fileInput'),
            fileUploadArea: document.getElementById('uploadArea'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            filePreview: document.getElementById('filePreview'),
            validationResult: document.getElementById('validationResult'),
            errorSection: document.getElementById('errorSection'),
            errorMessage: document.getElementById('errorMessage'),
            uploadPage: document.getElementById('uploadPage'),
            visualizationPage: document.getElementById('visualizationPage'),
            validationStatus: document.getElementById('validationStatus'),
            
            // Botones
            uploadBtn: document.getElementById('uploadBtn'),
            validateBtn: document.getElementById('validateBtn'),
            visualizeBtn: document.getElementById('visualizeBtn'),
            changeFileBtn: document.getElementById('changeFileBtn'),
            closeBtn: document.getElementById('closeBtn'),
            downloadPdfBtn: document.getElementById('downloadPdfBtn'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        
        return elements;
    }

    // Configura los eventos de la interfaz
    setupEventListeners(onFileSelect) {
        // Validar que los elementos existen
        if (!this.elements.fileUploadArea) {
            console.error('❌ Elemento uploadArea no encontrado');
            return;
        }
        if (!this.elements.fileInput) {
            console.error('❌ Elemento fileInput no encontrado');
            return;
        }

        // Click en área de carga (solo si NO es el botón)
        this.elements.fileUploadArea.addEventListener('click', (e) => {
            // No hacer nada si el click es en el botón (el botón tiene su propio handler)
            if (e.target === this.elements.uploadBtn) {
                return;
            }
            // No hacer nada si el click es en el input
            if (e.target === this.elements.fileInput) {
                return;
            }
            // Abriendo selector de archivos
            this.elements.fileInput.click();
        });

        // Selección de archivo
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
        });

        // Drag and drop
        this.elements.fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.fileUploadArea.classList.add('dragover');
        });

        this.elements.fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.elements.fileUploadArea.classList.remove('dragover');
        });

        this.elements.fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.fileUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onFileSelect(files[0]);
            }
        });

        // Click en botón de carga
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', () => {
                // Abriendo selector de archivos
                this.elements.fileInput.click();
            });
        } else {
            console.warn('⚠️ Botón uploadBtn no encontrado');
        }
    }

    // Función genérica para mostrar/ocultar elementos
    toggleElement(elementId, show, content = null, className = null) {
        const element = this.elements[elementId];
        if (!element) {
            console.warn(`⚠️ Elemento ${elementId} no encontrado`);
            return;
        }

        if (show) {
            element.style.display = 'block';
            if (content) element.textContent = content;
            if (className) element.className = className;
            if (elementId === 'validationResult') {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            element.style.display = 'none';
        }
    }

    // Muestra resultado de validación
    showResult(message, type) {
        if (this.elements.validationResult) {
            this.elements.validationResult.textContent = message;
            this.elements.validationResult.className = `result ${type}`;
            this.elements.validationResult.style.display = 'block';
            this.elements.validationResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Oculta resultado
    hideResult() {
        if (this.elements.validationResult) {
            this.elements.validationResult.style.display = 'none';
        } else {
            console.error('❌ validationResult no encontrado');
        }
    }

    // Controla estado de los botones
    setButtonState(loading, text = '') {
        const buttons = [
            this.elements.validateBtn,
            this.elements.visualizeBtn
        ].filter(Boolean);

        buttons.forEach(button => {
            if (loading) {
                button.disabled = true;
                button.innerHTML = `<span class="loading-spinner"></span>${text}`;
            } else {
                button.disabled = false;
                if (button === this.elements.validateBtn) {
                    button.textContent = 'Validar Documento';
                } else if (button === this.elements.visualizeBtn) {
                    button.textContent = 'Visualizar Factura';
                }
            }
        });
    }

    // Muestra información del archivo cargado
    showFileInfo(fileName, fileSize) {
        this.elements.fileName.textContent = `${fileName} (${fileSize})`;
    }

    // Muestra la previsualización del archivo
    showFilePreview() {
        if (this.elements.filePreview) {
            this.elements.filePreview.style.display = 'block';
        } else {
            console.error('❌ filePreview no encontrado');
        }
    }

    // Oculta la previsualización del archivo
    hideFilePreview() {
        if (this.elements.filePreview) {
            this.elements.filePreview.style.display = 'none';
        }
    }

    // Limpia el input de archivo
    clearFileInput() {
        this.elements.fileInput.value = '';
    }

    // Muestra una página
    showPage(pageId) {
        const pageElement = document.getElementById(pageId + 'Page');
        if (pageElement) {
            pageElement.style.display = 'block';
            pageElement.classList.remove('hidden');
        }
    }

    // Oculta una página
    hidePage(pageId) {
        const pageElement = document.getElementById(pageId + 'Page');
        if (pageElement) {
            pageElement.style.display = 'none';
            pageElement.classList.add('hidden');
        }
    }

    // Muestra sección de error
    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        if (this.elements.errorSection) {
            this.elements.errorSection.style.display = 'block';
        } else {
            console.error('❌ errorSection no encontrado');
        }
    }

    // Oculta sección de error
    hideError() {
        if (this.elements.errorSection) {
            this.elements.errorSection.style.display = 'none';
        } else {
            console.error('❌ errorSection no encontrado');
        }
    }

    // Muestra estado de validación en la visualización
    showValidationStatus(validationResult) {
        if (!this.elements.validationStatus) {
            console.error('❌ validationStatus no encontrado');
            return;
        }

        const statusClass = validationResult.isValid ? 'valid' : 'invalid';
        const statusIcon = validationResult.isValid ? '✅' : '❌';

        this.elements.validationStatus.innerHTML = `
            <div class="validation-status ${statusClass}">
                <span class="status-icon">${statusIcon}</span>
                <span class="status-text">${validationResult.message}</span>
                ${validationResult.errors ? `<div class="validation-errors">${validationResult.errors.join('<br>')}</div>` : ''}
            </div>
        `;
        this.elements.validationStatus.style.display = 'block';
    }

    // Oculta estado de validación
    hideValidationStatus() {
        if (this.elements.validationStatus) {
            this.elements.validationStatus.style.display = 'none';
        } else {
            console.error('❌ validationStatus no encontrado');
        }
    }

    // Configura el estado inicial de la interfaz
    setupInitialState() {
        this.hideResult();
        this.hideFilePreview();
        this.hideError();
        this.hideValidationStatus();
        this.showPage('upload');
        this.hidePage('visualization');
    }



}
