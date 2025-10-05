/**
 * Controlador Principal de la Aplicación
 * Gestiona validación, visualización y generación de PDFs de facturas UBL
 * Incluye medición de rendimiento con Temporal API
 */
import { Timer } from './timer.js';

export class AppController {
    // ==================== CONFIGURACIÓN Y CONSTANTES ====================
    
    static MESSAGES = {
        FILE_ALREADY_LOADED: 'Ya hay un archivo cargado. Usa el botón "🔄 Cambiar Archivo" para cargar otro.',
        FILE_TOO_LARGE: 'El archivo es demasiado grande. Máximo 10MB.',
        FILE_LOAD_ERROR: 'Error al leer el archivo.',
        NO_FILE: 'Carga un archivo XML UBL para continuar.',
        VALIDATION_REQUIRED: '⚠️ Primero debes validar el documento exitosamente.',
        VISUALIZER_UNAVAILABLE: 'Error: Módulo de visualización no disponible.',
        NO_INVOICE_FOR_PDF: 'No hay factura cargada para generar PDF.',
        SELECT_NEW_FILE: 'Selecciona un nuevo archivo.',
        VALIDATING: 'Validando documento...',
        PROCESSING_VISUALIZATION: 'Procesando visualización...'
    };

    static CONFIG = {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        VALIDATION_DELAY: 300 // ms
    };

    // ==================== CONSTRUCTOR E INICIALIZACIÓN ====================

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

    async initialize() {
        try {
            console.log('🚀 Iniciando aplicación...');
            
            this.initializeElements();
            await this.loadModules();
            this.setupEventListeners();
            
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showResult('Error cargando la aplicación. Recarga la página.', 'error');
        }
    }

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

    async loadModules() {
        // Cargar WebAssembly
        console.log('📦 Cargando WebAssembly...');
        const { default: init, validar_ubl } = await import('./rust/wasm-output/validador_ubl.js');
        await init();
        this.validator = { validate: validar_ubl };
        
        // Cargar TypeScript
        console.log('📝 Cargando módulos TypeScript...');
        const { UBLInvoiceVisualizer } = await import('./compiled/modules.js');
        this.visualizer = new UBLInvoiceVisualizer();
    }

    // ==================== CONFIGURACIÓN DE EVENTOS ====================

    setupEventListeners() {
        this.setupUploadAreaEvents();
        this.setupFileInputEvents();
        this.setupButtonEvents();
        this.setupGlobalFunctions();
    }

    setupUploadAreaEvents() {
        if (!this.elements.uploadArea) return;

        this.elements.uploadArea.addEventListener('click', (e) => this.handleUploadAreaClick(e));
        this.elements.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.elements.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.elements.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
    }

    setupFileInputEvents() {
        if (!this.elements.fileInput) return;

        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) this.handleFileSelect(file);
        });
    }

    setupButtonEvents() {
        const buttons = {
            validateBtn: () => this.validateDocument(),
            visualizeBtn: () => this.visualizeDocument(),
            downloadPdfBtn: () => this.downloadPDF(),
            changeFileBtn: () => this.changeFile(),
            closeBtn: () => this.goToUploadPage(),
            retryBtn: () => this.retryUpload()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            this.bindEvent(id, 'click', handler);
        });
    }

    setupGlobalFunctions() {
        window.validar = () => this.validateDocument();
        window.visualizar = () => this.visualizeDocument();
        window.clearFile = () => this.clearFile();
    }

    bindEvent(elementId, event, handler) {
        const element = this.elements[elementId];
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`⚠️ Elemento ${elementId} no encontrado`);
        }
    }

    // ==================== MANEJO DE EVENTOS DE CARGA ====================

    handleUploadAreaClick(e) {
        if (this.hasFileLoaded()) {
            e.preventDefault();
            this.showResult(AppController.MESSAGES.FILE_ALREADY_LOADED, 'warning');
            return;
        }
        if (e.target !== this.elements.validateBtn && e.target !== this.elements.fileInput) {
            this.elements.fileInput?.click();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        if (this.hasFileLoaded()) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        this.elements.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.elements.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.elements.uploadArea.classList.remove('dragover');
        
        if (this.hasFileLoaded()) {
            this.showResult(AppController.MESSAGES.FILE_ALREADY_LOADED, 'warning');
            return;
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) this.handleFileSelect(files[0]);
    }

    // ==================== MANEJO DE ARCHIVOS ====================

    handleFileSelect(file) {
        if (!this.validateFile(file)) return;

        const timer = new Timer('Carga de archivo XML (JavaScript)');
        timer.start();

        const reader = new FileReader();
        reader.onload = (e) => this.onFileLoaded(e, file, timer);
        reader.onerror = () => this.onFileLoadError(timer);
        reader.readAsText(file, 'UTF-8');
    }

    validateFile(file) {
        if (!file) {
            this.showResult(AppController.MESSAGES.NO_FILE, 'error');
            return false;
        }

        if (file.size > AppController.CONFIG.MAX_FILE_SIZE) {
            this.showResult(AppController.MESSAGES.FILE_TOO_LARGE, 'error');
            return false;
        }

        return true;
    }

    onFileLoaded(e, file, timer) {
        const timing = timer.end();
        
        this.state.xmlContent = e.target.result;
        this.state.currentFile = file;
        
        this.showFileInfo(file.name, this.formatFileSize(file.size));
        this.showResult(`Archivo cargado en ${timing.tiempoSegundos}s. Selecciona una acción.`, 'success');
        this.showFilePreview();
        this.updateVisualizationButtonState();
        this.disableUploadArea();
    }

    onFileLoadError(timer) {
        timer.endWithError(new Error('Error al leer el archivo'));
        this.showResult(AppController.MESSAGES.FILE_LOAD_ERROR, 'error');
    }

    clearFile() {
        // Limpiar input y estado
        if (this.elements.fileInput) this.elements.fileInput.value = '';
        this.state.currentFile = null;
        this.state.xmlContent = null;
        this.state.validationResult = null;
        this.state.currentView = 'upload';
        
        // Limpiar UI
        this.hideFileInfo();
        this.hideResult();
        this.hideFilePreview();
        this.hideError();
        
        // Cambiar vistas
        this.showPage('upload');
        this.hidePage('visualization');
        
        // Actualizar estado
        this.updateVisualizationButtonState();
        this.enableUploadArea();
    }

    changeFile() {
        this.showResult(AppController.MESSAGES.SELECT_NEW_FILE, 'warning');
        this.clearFile(); // Ya llama a hideFilePreview()
    }

    retryUpload() {
        this.clearFile(); // Ya llama a hideFilePreview() y hideError()
    }

    // ==================== VALIDACIÓN ====================

    async validateDocument() {
        if (!this.canValidate()) return;

        this.startProcessing(AppController.MESSAGES.VALIDATING);
        await this.delay(AppController.CONFIG.VALIDATION_DELAY);
        
        const timer = new Timer('Validación WebAssembly UBL');
        timer.start();
        
        try {
            await this.performValidation(timer);
        } catch (error) {
            this.handleValidationError(error, timer);
        } finally {
            this.endProcessing();
        }
    }

    canValidate() {
        if (this.state.isProcessing || !this.state.xmlContent) {
            this.showResult(AppController.MESSAGES.NO_FILE, 'warning');
            return false;
        }
        return true;
    }

    async performValidation(timer) {
        console.log('🔍 Validando contenido XML:', this.state.xmlContent.substring(0, 200) + '...');
        
        const resultado = this.validator.validate(this.state.xmlContent);
        const timing = timer.end();
        
        console.log('🔍 Resultado de validación:', resultado);
        
        this.state.validationResult = {
            isValid: true,
            message: '✅ Documento válido: Cumple con todos los requisitos UBL'
        };
        
        this.showResult(
            `${this.state.validationResult.message} (WebAssembly: ${timing.tiempoSegundos}s)`,
            'success'
        );
        this.updateVisualizationButtonState();
    }

    handleValidationError(error, timer) {
        const timing = timer.endWithError(error);
        
        console.error('Error durante validación:', error);
        
        const errorMessage = this.extractErrorMessage(error);
        
        this.state.validationResult = {
            isValid: false,
            message: `❌ Documento inválido: ${errorMessage}`,
            errors: [errorMessage]
        };
        
        this.showResult(
            `${this.state.validationResult.message} (WebAssembly: ${timing.tiempoSegundos}s)`,
            'error'
        );
        this.updateVisualizationButtonState();
    }

    // ==================== VISUALIZACIÓN ====================

    async visualizeDocument() {
        if (!this.canVisualize()) return;

        this.startProcessing(AppController.MESSAGES.PROCESSING_VISUALIZATION);

        try {
            await this.performVisualization();
        } catch (error) {
            this.handleVisualizationError(error);
        } finally {
            this.endProcessing();
        }
    }

    canVisualize() {
        if (this.state.isProcessing || !this.state.xmlContent) {
            this.showResult(AppController.MESSAGES.NO_FILE, 'warning');
            return false;
        }

        if (!this.visualizer) {
            this.showResult(AppController.MESSAGES.VISUALIZER_UNAVAILABLE, 'error');
            return false;
        }

        if (!this.state.validationResult || !this.state.validationResult.isValid) {
            this.showResult(AppController.MESSAGES.VALIDATION_REQUIRED, 'warning');
            return false;
        }

        return true;
    }

    async performVisualization() {
        const timer = new Timer('Visualización de documento UBL');
        timer.start();
        
        await this.visualizer.processXMLFile(this.state.xmlContent, this.state.validationResult);
        
        const timing = timer.end();
        
        this.showResult(
            `✅ Visualización completada en ${timing.tiempoSegundos} segundos`,
            'success'
        );
        
        this.goToVisualizationPage();
    }

    handleVisualizationError(error) {
        console.error('Error durante visualización:', error);
        this.showResult(`Error al visualizar el documento: ${error.message}`, 'error');
    }

    // ==================== GENERACIÓN DE PDF ====================

    async downloadPDF() {
        if (!this.visualizer || !this.visualizer.hasInvoice()) {
            this.showResult(AppController.MESSAGES.NO_INVOICE_FOR_PDF, 'warning');
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

    // ==================== NAVEGACIÓN ====================

    goToVisualizationPage() {
        this.state.currentView = 'visualization';
        this.showPage('visualization');
        this.hidePage('upload');
    }

    goToUploadPage() {
        this.state.currentView = 'upload';
        this.showPage('upload');
        this.hidePage('visualization');
        
        if (this.visualizer) {
            this.visualizer.clearInvoice();
        }
    }

    // ==================== GESTIÓN DE ESTADO ====================

    hasFileLoaded() {
        return this.state.xmlContent !== null;
    }

    startProcessing(message) {
        this.state.isProcessing = true;
        this.setButtonState(true, message);
        this.showResult(message, 'loading');
    }

    endProcessing() {
        this.state.isProcessing = false;
        this.setButtonState(false);
    }

    updateVisualizationButtonState() {
        const visualizeBtn = this.elements.visualizeBtn;
        if (!visualizeBtn) return;
        
        const isValid = this.state.validationResult?.isValid;
        
        visualizeBtn.disabled = !isValid;
        visualizeBtn.classList.toggle('disabled', !isValid);
        visualizeBtn.title = isValid
            ? 'Visualizar factura validada'
            : this.state.validationResult?.isValid === false
                ? 'Primero debes validar el documento exitosamente'
                : 'Primero debes validar el documento';
    }

    // ==================== CONTROL DE ÁREA DE CARGA ====================

    disableUploadArea() {
        this.setUploadAreaStyle('0.6', 'not-allowed');
    }

    enableUploadArea() {
        this.setUploadAreaStyle('1', 'pointer');
    }

    setUploadAreaStyle(opacity, cursor) {
        if (!this.elements.uploadArea) return;
        
        this.elements.uploadArea.style.opacity = opacity;
        this.elements.uploadArea.style.cursor = cursor;
        this.elements.uploadArea.style.pointerEvents = 'auto';
    }

    // ==================== INTERFAZ DE USUARIO ====================

    showResult(message, type) {
        const element = this.elements.validationResult;
        if (!element) return;
        
        element.textContent = message;
        element.className = `result ${type}`;
        element.style.display = 'block';
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideResult() {
        if (this.elements.validationResult) {
            this.elements.validationResult.style.display = 'none';
        }
    }

    setButtonState(loading, text = '') {
        const buttons = [this.elements.validateBtn, this.elements.visualizeBtn];
        
        buttons.forEach(button => {
            if (!button) return;
            
            button.disabled = loading;
            button.innerHTML = loading
                ? `<span class="loading-spinner"></span>${text}`
                : button.id === 'validateBtn' ? 'Validar Documento' : 'Visualizar Factura';
        });
    }

    showFileInfo(fileName, fileSize) {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = `${fileName} (${fileSize})`;
        }
    }

    hideFileInfo() {
        if (this.elements.fileName) {
            this.elements.fileName.textContent = '';
        }
    }

    showFilePreview() {
        this.toggleElement('filePreview', true);
    }

    hideFilePreview() {
        this.toggleElement('filePreview', false);
    }

    showPage(pageId) {
        this.togglePage(pageId, true);
    }

    hidePage(pageId) {
        this.togglePage(pageId, false);
    }

    togglePage(pageId, show) {
        const pageElement = this.elements[pageId + 'Page'];
        if (!pageElement) return;
        
        pageElement.style.display = show ? 'block' : 'none';
        pageElement.classList.toggle('hidden', !show);
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        this.toggleElement('errorSection', true);
    }

    hideError() {
        this.toggleElement('errorSection', false);
    }

    toggleElement(elementId, show) {
        const element = this.elements[elementId];
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    // ==================== UTILIDADES ====================

    extractErrorMessage(error) {
        if (error && error.message) {
            return error.message;
        } else if (error && typeof error === 'string') {
            return error;
        } else if (error && error.toString) {
            return error.toString();
        }
        return 'Error desconocido durante la validación';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

