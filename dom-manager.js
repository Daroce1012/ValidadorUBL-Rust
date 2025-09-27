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
        } else {
            console.log('✅ Todos los elementos del DOM encontrados correctamente');
        }
    }

    // Obtiene referencias a los elementos del DOM
    _getElements() {
        return {
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
            console.log('🖱️ Click en área de carga, abriendo selector de archivos');
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
                console.log('🖱️ Click en botón de carga, abriendo selector de archivos');
                this.elements.fileInput.click();
            });
        } else {
            console.warn('⚠️ Botón uploadBtn no encontrado');
        }
    }

    // Muestra resultado de validación
    showResult(message, type) {
        const { validationResult } = this.elements;
        validationResult.textContent = message;
        validationResult.className = `result ${type}`;
        validationResult.style.display = 'block';
        validationResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Oculta resultado
    hideResult() {
        this.elements.validationResult.style.display = 'none';
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

    // Oculta información del archivo
    hideFileInfo() {
        // No hay elemento específico para ocultar en la interfaz unificada
    }

    // Muestra la previsualización del archivo
    showFilePreview() {
        this.elements.filePreview.style.display = 'block';
    }

    // Oculta la previsualización del archivo
    hideFilePreview() {
        this.elements.filePreview.style.display = 'none';
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
        this.elements.errorMessage.textContent = message;
        this.elements.errorSection.style.display = 'block';
    }

    // Oculta sección de error
    hideError() {
        this.elements.errorSection.style.display = 'none';
    }

    // Muestra estado de validación en la visualización
    showValidationStatus(validationResult) {
        if (!this.elements.validationStatus) return;

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

    // Muestra un mensaje de éxito
    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #059669, #047857);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Muestra un mensaje de error
    showErrorMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Valida que todos los elementos necesarios estén presentes
    validateElements() {
        const requiredElements = [
            'fileInput', 'fileUploadArea', 'fileName', 'filePreview',
            'validationResult', 'errorSection', 'uploadPage', 'visualizationPage'
        ];

        const missingElements = requiredElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.warn('Elementos del DOM faltantes:', missingElements);
            return false;
        }
        
        return true;
    }

    // Obtiene el estado actual de la interfaz
    getInterfaceState() {
        return {
            uploadPageVisible: this.elements.uploadPage.style.display !== 'none',
            visualizationPageVisible: this.elements.visualizationPage.style.display !== 'none',
            filePreviewVisible: this.elements.filePreview.style.display !== 'none',
            errorVisible: this.elements.errorSection.style.display !== 'none',
            validationResultVisible: this.elements.validationResult.style.display !== 'none'
        };
    }
}
