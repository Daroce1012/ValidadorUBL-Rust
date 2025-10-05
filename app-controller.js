/**
 * Controlador Principal de la Aplicación
 * Gestiona validación, visualización y generación de PDFs de facturas UBL
 * Incluye medición de rendimiento con Temporal API
 * Refactorizado para usar FileManager y UIManager
 */
import { Timer } from './timer.js';
import { FileManager } from './FileManager.js';
import { UIManager } from './UIManager.js';

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
            isProcessing: false,
            currentView: 'upload'
        };
        this.validator = null;
        this.visualizer = null;
        
        // Inicializar managers después de cargar elementos
        this.fileManager = null;
        this.uiManager = null;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando aplicación...');
            
            this.initializeElements();
            await this.loadModules();
            this.initializeManagers();
            this.setupEventListeners();
            
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.uiManager.showResult('Error cargando la aplicación. Recarga la página.', 'error');
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

    initializeManagers() {
        this.fileManager = new FileManager();
        this.fileManager.initialize({
            maxFileSize: AppController.CONFIG.MAX_FILE_SIZE
        });
        
        this.uiManager = new UIManager(this.elements);
        this.uiManager.initialize(this);
    }

    // ==================== CONFIGURACIÓN DE EVENTOS ====================

    setupEventListeners() {
        // Los eventos ya se configuran automáticamente en uiManager.initialize()
        // Este método se mantiene por compatibilidad pero ya no es necesario
    }

    // ==================== MANEJO DE ARCHIVOS ====================

    handleFileSelect(file) {
        const validation = this.fileManager.validateFile(file);
        if (!validation.isValid) {
            this.uiManager.showResult(validation.error, 'error');
            return;
        }

        const timer = new Timer('Carga de archivo XML (JavaScript)');
        timer.start();

        this.fileManager.loadFile(file)
            .then((xmlContent) => this.onFileLoaded(xmlContent, file, timer))
            .catch((error) => this.onFileLoadError(error, timer));
    }

    onFileLoaded(xmlContent, file, timer) {
        const timing = timer.end();
        
        this.fileManager.clearValidation(); // Limpiar solo validación anterior
        
        this.uiManager.showFileInfo(file.name, this.fileManager.formatFileSize(file.size));
        this.uiManager.showResult(`Archivo cargado en ${timing.tiempoSegundos}s. Selecciona una acción.`, 'success');
        this.uiManager.showFilePreview();
        this.updateVisualizationButtonState();
        this.uiManager.disableUploadArea();
    }

    onFileLoadError(error, timer) {
        timer.endWithError(error);
        this.uiManager.showResult(AppController.MESSAGES.FILE_LOAD_ERROR, 'error');
    }

    clearFile() {
        // Limpiar input y estado
        if (this.elements.fileInput) this.elements.fileInput.value = '';
        this.fileManager.clearAll(); // Usar método más específico
        this.state.currentView = 'upload';
        
        // Limpiar UI usando el método centralizado
        this.uiManager.clearUI();
        
        // Cambiar a vista de carga
        this.uiManager.goToUploadView();
        
        // Actualizar estado
        this.updateVisualizationButtonState();
        this.uiManager.enableUploadArea();
    }

    changeFile() {
        this.uiManager.showResult(AppController.MESSAGES.SELECT_NEW_FILE, 'warning');
        this.clearFile(); // Ya llama a hideFilePreview()
    }

    retryUpload() {
        this.clearFile(); // Ya llama a hideFilePreview() y hideError()
    }

    // ==================== VALIDACIÓN ====================

    async validateDocument() {
        if (this.isProcessing() || !this.hasXMLContent()) {
            this.uiManager.showResult(AppController.MESSAGES.NO_FILE, 'warning');
            return;
        }

        this.setProcessingState(true);
        this.uiManager.startProcessing(AppController.MESSAGES.VALIDATING);
        await this.delay(AppController.CONFIG.VALIDATION_DELAY);
        
        const timer = new Timer('Validación WebAssembly UBL');
        timer.start();
        
        try {
            await this.performValidation(timer);
        } catch (error) {
            this.handleValidationError(error, timer);
        } finally {
            this.setProcessingState(false);
            this.uiManager.endProcessing();
        }
    }

    async performValidation(timer) {
        console.log('🔍 Validando contenido XML:', this.fileManager.getXMLContent().substring(0, 200) + '...');
        
        const resultado = this.validator.validate(this.fileManager.getXMLContent());
        const timing = timer.end();
        
        console.log('🔍 Resultado de validación:', resultado);
        
        const validationResult = {
            isValid: true,
            message: '✅ Documento válido: Cumple con todos los requisitos UBL'
        };
        
        this.fileManager.setValidationResult(validationResult);
        
        this.uiManager.showResult(
            `${validationResult.message} (WebAssembly: ${timing.tiempoSegundos}s)`,
            'success'
        );
        this.updateVisualizationButtonState();
    }

    handleValidationError(error, timer) {
        const timing = timer.endWithError(error);
        
        console.error('Error durante validación:', error);
        
        const errorMessage = this.uiManager.extractErrorMessage(error);
        
        const validationResult = {
            isValid: false,
            message: `❌ Documento inválido: ${errorMessage}`,
            errors: [errorMessage]
        };
        
        this.fileManager.setValidationResult(validationResult);
        
        this.uiManager.showResult(
            `${validationResult.message} (WebAssembly: ${timing.tiempoSegundos}s)`,
            'error'
        );
        this.updateVisualizationButtonState();
    }

    // ==================== VISUALIZACIÓN ====================

    async visualizeDocument() {
        if (this.isProcessing() || !this.hasXMLContent()) {
            this.uiManager.showResult(AppController.MESSAGES.NO_FILE, 'warning');
            return;
        }

        if (!this.isVisualizerAvailable()) {
            this.uiManager.showResult(AppController.MESSAGES.VISUALIZER_UNAVAILABLE, 'error');
            return;
        }

        if (!this.hasValidValidationResult()) {
            this.uiManager.showResult(AppController.MESSAGES.VALIDATION_REQUIRED, 'warning');
            return;
        }

        this.setProcessingState(true);
        this.uiManager.startProcessing(AppController.MESSAGES.PROCESSING_VISUALIZATION);

        try {
            await this.performVisualization();
        } catch (error) {
            this.handleVisualizationError(error);
        } finally {
            this.setProcessingState(false);
            this.uiManager.endProcessing();
        }
    }

    async performVisualization() {
        const timer = new Timer('Visualización de documento UBL');
        timer.start();
        
        await this.visualizer.processXMLFile(
            this.fileManager.getXMLContent(), 
            this.fileManager.getValidationResult()
        );
        
        const timing = timer.end();
        
        this.uiManager.showResult(
            `✅ Visualización completada en ${timing.tiempoSegundos} segundos`,
            'success'
        );
        
        this.goToVisualizationPage();
    }

    handleVisualizationError(error) {
        console.error('Error durante visualización:', error);
        this.uiManager.showResult(`Error al visualizar el documento: ${error.message}`, 'error');
    }

    // ==================== GENERACIÓN DE PDF ====================

    async downloadPDF() {
        if (!this.isVisualizerAvailable() || !this.visualizer.hasInvoice()) {
            this.uiManager.showResult(AppController.MESSAGES.NO_INVOICE_FOR_PDF, 'warning');
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
        this.uiManager.goToVisualizationView();
    }

    goToUploadPage() {
        this.state.currentView = 'upload';
        this.uiManager.goToUploadView();
        
        if (this.visualizer) {
            this.visualizer.clearInvoice();
        }
    }

    // ==================== UTILIDADES Y HELPERS ====================
    // Verifica si hay contenido XML disponible
    hasXMLContent() {
        return this.fileManager && this.fileManager.getXMLContent();
    }

    // Verifica si el documento está siendo procesado
    isProcessing() {
        return this.state.isProcessing;
    }

    // Verifica si el visualizador está disponible
    isVisualizerAvailable() {
        return this.visualizer !== null;
    }

    // Verifica si hay resultado de validación válido
    hasValidValidationResult() {
        const result = this.fileManager.getValidationResult();
        return result && result.isValid;
    }

    // Establece el estado de procesamiento
    setProcessingState(processing) {
        this.state.isProcessing = processing;
    }

    // Actualiza el estado del botón de visualización
    updateVisualizationButtonState() {
        const validationResult = this.fileManager.getValidationResult();
        this.uiManager.updateVisualizationButtonState(validationResult?.isValid);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}