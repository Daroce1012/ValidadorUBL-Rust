/**
 * Controlador Principal Unificado
 * Integra todas las funcionalidades de la aplicación UBL
 */
export class AppController {
    constructor() {
        this.elements = {};
        this.state = {
            currentFile: null,
            xmlContent: null,
            validationResult: null,
            isProcessing: false,
            currentView: 'upload'
        };
        this.validator = null;
        this.visualizer = null;
    }

    // Inicializa la aplicación
    async initialize() {
        try {
            console.log('🚀 Iniciando aplicación...');
            
            // Inicializar elementos del DOM
            this.initializeElements();
            
            // Cargar WebAssembly
            console.log('📦 Cargando WebAssembly...');
            const { default: init, validar_ubl } = await import('./rust/wasm-output/validador_ubl.js');
            await init();
            this.validator = { validate: validar_ubl };
            
            // Cargar TypeScript
            console.log('📝 Cargando módulos TypeScript...');
            const { UBLInvoiceVisualizer } = await import('./compiled/modules.js');
            this.visualizer = new UBLInvoiceVisualizer();
            
            // Configurar eventos
            this.setupEventListeners();
            
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showResult('Error cargando la aplicación. Recarga la página.', 'error');
        }
    }

    // Inicializa referencias a elementos del DOM
    initializeElements() {
        const elementIds = [
            'fileInput', 'uploadArea', 'fileName', 'filePreview',
            'validationResult', 'uploadPage', 'visualizationPage',
            'validateBtn', 'visualizeBtn', 'downloadPdfBtn', 'changeFileBtn',
            'closeBtn', 'retryBtn', 'errorSection', 'errorMessage',
            'validationStatus', 'supplierInfo', 'customerInfo',
            'invoiceNumber', 'invoiceDate', 'invoiceCurrency', 'invoiceTableBody', 'totalsInfo'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    // Configura todos los event listeners
    setupEventListeners() {
        // Área de carga de archivos
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', (e) => {
                if (e.target !== this.elements.validateBtn && e.target !== this.elements.fileInput) {
                    this.elements.fileInput?.click();
                }
            });

            // Drag and drop
            this.elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.add('dragover');
            });

            this.elements.uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.remove('dragover');
            });

            this.elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) this.handleFileSelect(files[0]);
            });
        }

        // Input de archivo
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) this.handleFileSelect(file);
            });
        }

        // Botones
        this.bindEvent('validateBtn', 'click', () => this.validateDocument());
        this.bindEvent('visualizeBtn', 'click', () => this.visualizeDocument());
        this.bindEvent('downloadPdfBtn', 'click', () => this.downloadPDF());
        this.bindEvent('changeFileBtn', 'click', () => this.changeFile());
        this.bindEvent('closeBtn', 'click', () => this.goToUploadPage());
        this.bindEvent('retryBtn', 'click', () => this.retryUpload());

        // Funciones globales para compatibilidad
        window.validar = () => this.validateDocument();
        window.visualizar = () => this.visualizeDocument();
        window.clearFile = () => this.clearFile();
    }

    // Método auxiliar para bindear eventos
    bindEvent(elementId, event, handler) {
        const element = this.elements[elementId];
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Elemento ${elementId} no encontrado`);
        }
    }

    // Maneja la selección de archivos
    handleFileSelect(file) {
        if (!file) {
            this.showResult('No se pudo cargar el archivo.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showResult('El archivo es demasiado grande. Máximo 10MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.state.xmlContent = e.target.result;
            this.state.currentFile = file;
            this.showFileInfo(file.name, this.formatFileSize(file.size));
            this.showResult('Archivo cargado. Selecciona una acción.', 'success');
            this.showFilePreview();
            this.updateVisualizationButtonState();
        };
        reader.onerror = () => this.showResult('Error al leer el archivo.', 'error');
        reader.readAsText(file, 'UTF-8');
    }

    // Valida el documento UBL
    async validateDocument() {
        if (this.state.isProcessing || !this.state.xmlContent) {
            this.showResult('Carga un archivo XML UBL para validar.', 'warning');
            return;
        }

        this.state.isProcessing = true;
        this.setButtonState(true, 'Validando documento...');
        this.showResult('Validando documento...', 'loading');

        try {
            await this.delay(300); // Simular tiempo de procesamiento
            
            // La función validar_ubl devuelve un Result<String, String>
            // En JavaScript, cuando es Ok devuelve el string, cuando es Err lanza una excepción
            console.log('🔍 Validando contenido XML:', this.state.xmlContent.substring(0, 200) + '...');
            console.log('🔍 Validador disponible:', this.validator);
            console.log('🔍 Función validate:', this.validator.validate);
            
            const resultado = this.validator.validate(this.state.xmlContent);
            console.log('🔍 Resultado de validación:', resultado);
            console.log('🔍 Tipo de resultado:', typeof resultado);
            
            // Si llegamos aquí, significa que la validación fue exitosa (Ok)
            this.state.validationResult = {
                isValid: true,
                message: '✅ Documento válido: Cumple con todos los requisitos UBL'
            };
            this.showResult(this.state.validationResult.message, 'success');
            this.updateVisualizationButtonState();
            
        } catch (error) {
            console.error('Error durante validación:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Si hay una excepción, significa que la validación falló (Err)
            // El mensaje de error viene en error.message
            let errorMessage = 'Error desconocido durante la validación';
            
            if (error && error.message) {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            } else if (error && error.toString) {
                errorMessage = error.toString();
            }
            
            this.state.validationResult = {
                isValid: false,
                message: `❌ Documento inválido: ${errorMessage}`,
                errors: [errorMessage]
            };
            this.showResult(this.state.validationResult.message, 'error');
            this.updateVisualizationButtonState();
        }

        this.state.isProcessing = false;
        this.setButtonState(false);
    }

    // Visualiza el documento UBL
    async visualizeDocument() {
        if (this.state.isProcessing || !this.state.xmlContent) {
            this.showResult('Carga un archivo XML UBL para visualizar.', 'warning');
            return;
        }

        if (!this.visualizer) {
            this.showResult('Error: Módulo de visualización no disponible.', 'error');
            return;
        }

        if (!this.state.validationResult || !this.state.validationResult.isValid) {
            this.showResult('⚠️ Primero debes validar el documento exitosamente.', 'warning');
            return;
        }

        this.state.isProcessing = true;
        this.setButtonState(true, 'Procesando visualización...');

        try {
            await this.visualizer.processXMLFile(this.state.xmlContent, this.state.validationResult);
            this.goToVisualizationPage();
        } catch (error) {
            console.error('Error durante visualización:', error);
            this.showResult(`Error al visualizar el documento: ${error.message}`, 'error');
        }

        this.state.isProcessing = false;
        this.setButtonState(false);
    }

    // Genera y descarga PDF
    async downloadPDF() {
        if (!this.visualizer || !this.visualizer.hasInvoice()) {
            this.showResult('No hay factura cargada para generar PDF.', 'warning');
            return;
        }

        try {
            await this.visualizer.generatePDFFromHTML();
            this.visualizer.showSuccessMessage('PDF generado exitosamente');
        } catch (error) {
            console.error('Error generando PDF:', error);
            this.visualizer.showErrorMessage(`Error generando PDF: ${error.message}`);
        }
    }

    // Cambia a la página de visualización
    goToVisualizationPage() {
        this.state.currentView = 'visualization';
        this.showPage('visualization');
        this.hidePage('upload');
    }

    // Cambia a la página de carga
    goToUploadPage() {
        this.state.currentView = 'upload';
        this.showPage('upload');
        this.hidePage('visualization');
        
        if (this.visualizer) {
            this.visualizer.clearInvoice();
        }
    }

    // Cambia el archivo
    changeFile() {
        this.hideFilePreview();
        this.showResult('Selecciona un nuevo archivo.', 'warning');
        this.clearFile();
    }

    // Reintenta la carga
    retryUpload() {
        this.clearFile();
        this.hideFilePreview();
        this.hideError();
    }

    // Limpia el archivo cargado
    clearFile() {
        if (this.elements.fileInput) this.elements.fileInput.value = '';
        this.state.currentFile = null;
        this.state.xmlContent = null;
        this.state.validationResult = null;
        this.state.currentView = 'upload';
        this.hideFileInfo();
        this.hideResult();
        this.hideFilePreview();
        this.hideError();
        this.showPage('upload');
        this.hidePage('visualization');
        this.updateVisualizationButtonState();
    }

    // Actualiza el estado del botón de visualización
    updateVisualizationButtonState() {
        const visualizeBtn = this.elements.visualizeBtn;
        if (!visualizeBtn) return;
        
        if (this.state.validationResult && this.state.validationResult.isValid) {
            visualizeBtn.disabled = false;
            visualizeBtn.classList.remove('disabled');
            visualizeBtn.title = 'Visualizar factura validada';
        } else {
            visualizeBtn.disabled = true;
            visualizeBtn.classList.add('disabled');
            visualizeBtn.title = this.state.validationResult && !this.state.validationResult.isValid
                ? 'Primero debes validar el documento exitosamente'
                : 'Primero debes validar el documento';
        }
    }

    // === MÉTODOS DE INTERFAZ ===

    // Muestra resultado de validación
    showResult(message, type) {
        const element = this.elements.validationResult;
        if (element) {
            element.textContent = message;
            element.className = `result ${type}`;
            element.style.display = 'block';
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Oculta resultado
    hideResult() {
        if (this.elements.validationResult) {
            this.elements.validationResult.style.display = 'none';
        }
    }

    // Controla estado de los botones
    setButtonState(loading, text = '') {
        const buttons = [this.elements.validateBtn, this.elements.visualizeBtn];
        buttons.forEach(button => {
            if (button) {
                button.disabled = loading;
                if (loading) {
                    button.innerHTML = `<span class="loading-spinner"></span>${text}`;
                } else {
                    button.textContent = button.id === 'validateBtn' ? 'Validar Documento' : 'Visualizar Factura';
                }
            }
        });
    }

    // Muestra información del archivo
    showFileInfo(fileName, fileSize) {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = `${fileName} (${fileSize})`;
        }
    }

    // Oculta información del archivo
    hideFileInfo() {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = '';
        }
    }

    // Muestra previsualización del archivo
    showFilePreview() {
        if (this.elements.filePreview) {
            this.elements.filePreview.style.display = 'block';
        }
    }

    // Oculta previsualización del archivo
    hideFilePreview() {
        if (this.elements.filePreview) {
            this.elements.filePreview.style.display = 'none';
        }
    }

    // Muestra una página
    showPage(pageId) {
        const pageElement = this.elements[pageId + 'Page'];
        if (pageElement) {
            pageElement.style.display = 'block';
            pageElement.classList.remove('hidden');
        }
    }

    // Oculta una página
    hidePage(pageId) {
        const pageElement = this.elements[pageId + 'Page'];
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
        }
    }

    // Oculta sección de error
    hideError() {
        if (this.elements.errorSection) {
            this.elements.errorSection.style.display = 'none';
        }
    }

    // === MÉTODOS AUXILIARES ===

    // Formatea el tamaño de archivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Delay para efectos visuales
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
