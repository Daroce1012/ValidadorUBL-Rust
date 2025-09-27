/**
 * Controlador Principal Unificado de la Aplicación
 * Integra validación UBL y visualización de facturas
 */
import { UnifiedDOMManager } from './dom-manager.js';
import { FileHandler } from './file-handler.js';
import { UBLValidator } from './ubl-validator.js';
import { Logger } from './utils.js';

export class UnifiedAppController {
    constructor() {
        this.dom = new UnifiedDOMManager();
        this.fileHandler = new FileHandler();
        this.validator = new UBLValidator();
        this.processing = false;
        this.currentView = 'upload';
        this.visualizer = null; // Se inicializará cuando se cargue TypeScript
        this.validationResult = null;
    }

    // Inicializa la aplicación
    async initialize() {
        try {
            Logger.info('🚀 Iniciando aplicación...');
            
            // Inicializar validador WebAssembly
            Logger.info('📦 Inicializando WebAssembly...');
            await this.validator.initialize();
            
            // Cargar módulo TypeScript compilado
            Logger.info('📝 Cargando módulos TypeScript...');
            await this.loadTypeScriptModules();
            
            // Configurar eventos y funciones globales
            Logger.info('⚙️ Configurando eventos...');
            this._setupEvents();
            this._setupGlobalFunctions();
            
            Logger.info('✅ Aplicación unificada inicializada correctamente');
        } catch (error) {
            Logger.error('❌ Error inicializando la aplicación:', error);
            this.dom.showResult('Error cargando la aplicación. Recarga la página.', 'error');
        }
    }

    // Carga los módulos TypeScript compilados
    async loadTypeScriptModules() {
        try {
            const { UBLInvoiceVisualizer } = await import('./compiled/modules.js');
            this.visualizer = new UBLInvoiceVisualizer();
            Logger.info('✅ Módulos TypeScript cargados');
        } catch (error) {
            Logger.error('❌ Error cargando módulos TypeScript:', error);
            Logger.error('Detalles del error:', error);
            Logger.warn('⚠️ Asegúrate de ejecutar la aplicación desde un servidor HTTP (no file://)');
            Logger.warn('⚠️ Continuando sin módulos TypeScript - solo validación disponible');
            this.visualizer = null;
        }
    }

    // Configura eventos de la interfaz
    _setupEvents() {
        Logger.info('🔗 Configurando event listeners...');
        this.dom.setupEventListeners((file) => this._handleFileSelect(file));
        this._setupAppEvents();
        Logger.info('✅ Eventos configurados correctamente');
    }

    _setupAppEvents() {
        // Eventos de la aplicación - solo configuración, sin lógica
        this._bindEvent('validateBtn', 'click', () => this.validateDocument());
        this._bindEvent('visualizeBtn', 'click', () => this.visualizeDocument());
        this._bindEvent('changeFileBtn', 'click', () => this.changeFile());
        this._bindEvent('closeBtn', 'click', () => this.goToUploadPage());
        this._bindEvent('downloadPdfBtn', 'click', () => this.downloadPDF());
        this._bindEvent('retryBtn', 'click', () => this.retryUpload());
        
    }

    _bindEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
        element.addEventListener(event, handler);
        } else {
            console.error(`❌ Elemento ${elementId} no encontrado para registrar evento ${event}`);
        }
    }

    _setupGlobalFunctions() {
        window.validar = () => this.validateDocument();
        window.visualizar = () => this.visualizeDocument();
        window.clearFile = () => this.clearFile();
    }

    // Maneja selección de archivo
    _handleFileSelect(file) {
        this.fileHandler.handleFile(
            file,
            (file, fileSize) => this._onFileLoaded(file, fileSize),
            (error) => this.dom.showResult(error, 'error')
        );
    }

    // Callback cuando archivo se carga
    _onFileLoaded(file, fileSize) {
        this.dom.showFileInfo(file.name, fileSize);
        this.dom.hideResult();
        this.dom.showResult('Archivo cargado. Selecciona una acción.', 'success');
        this.dom.showFilePreview();
        
        // Resetear estado de validación y actualizar botones
        this.validationResult = null;
        this.updateVisualizationButtonState();
    }

    // Valida el documento UBL
    async validateDocument() {
        if (this.processing) return;
        
        if (!this.fileHandler.hasFile()) {
            this.dom.showResult('Carga un archivo XML UBL para validar.', 'warning');
            return;
        }
        
        this.processing = true;
        this.dom.setButtonState(true, 'Validando documento...');
        this.dom.showResult('Validando documento...', 'loading');
        
        const content = this.fileHandler.getLoadedContent();
        
        try {
            await this.validator.validate(content, (message, type) => {
                this.dom.showResult(message, type);
                
                // Guardar resultado de validación
                if (type === 'success' || type === 'error') {
                    this.validationResult = {
                        isValid: type === 'success',
                        message: message,
                        errors: type === 'error' ? [message] : undefined
                    };
                    
                    // Actualizar estado del botón de visualización
                    this.updateVisualizationButtonState();
                }
            });
        } catch (error) {
            Logger.error('Error durante validación:', error);
            this.dom.showResult(`Error durante la validación: ${error.message}`, 'error');
        }
        
        this.processing = false;
        this.dom.setButtonState(false, 'Validar Documento');
    }

    // Visualiza el documento UBL
    async visualizeDocument() {
        if (this.processing) return;
        
        if (!this.fileHandler.hasFile()) {
            this.dom.showResult('Carga un archivo XML UBL para visualizar.', 'warning');
            return;
        }
        
        if (!this.visualizer) {
            this.dom.showResult('Error: Módulo de visualización no disponible.', 'error');
            return;
        }
        
        // Verificar que la validación fue exitosa
        if (!this.validationResult || !this.validationResult.isValid) {
            this.dom.showResult('⚠️ Primero debes validar el documento exitosamente antes de visualizarlo.', 'warning');
            return;
        }
        
        this.processing = true;
        this.dom.setButtonState(true, 'Procesando visualización...');
        
        const content = this.fileHandler.getLoadedContent();
        
        try {
            // Procesar archivo con visualizador TypeScript
            await this.visualizer.processXMLFile(content, this.validationResult);
            
            // Cambiar a vista de visualización
            this.goToVisualizationPage();
            
        } catch (error) {
            Logger.error('Error durante visualización:', error);
            this.dom.showResult(`Error al visualizar el documento: ${error.message}`, 'error');
        }
        
        this.processing = false;
        this.dom.setButtonState(false, 'Visualizar Factura');
    }

    // Descarga PDF de la factura visualizada
    async downloadPDF() {
        if (!this.visualizer || !this.visualizer.hasInvoice()) {
            this.dom.showResult('No hay factura cargada para generar PDF.', 'warning');
            return;
        }
        
        try {
            await this.visualizer.generatePDFFromHTML();
            this.visualizer.showSuccessMessage('PDF generado exitosamente');
        } catch (error) {
            Logger.error('Error generando PDF:', error);
            this.visualizer.showErrorMessage(`Error generando PDF: ${error.message}`);
        }
    }

    // Cambia a la página de visualización
    goToVisualizationPage() {
        this.currentView = 'visualization';
        this.dom.showPage('visualization');
        this.dom.hidePage('upload');
    }

    // Cambia a la página de carga
    goToUploadPage() {
        this.currentView = 'upload';
        this.dom.showPage('upload');
        this.dom.hidePage('visualization');
        
        // Limpiar visualizador
        if (this.visualizer) {
            this.visualizer.clearInvoice();
        }
    }

    // Cambia el archivo
    changeFile() {
        // Ocultar previsualización del archivo
        const filePreview = document.getElementById('filePreview');
        if (filePreview) {
            filePreview.style.display = 'none';
        }
        
        // Mostrar mensaje de selección
        const validationResult = document.getElementById('validationResult');
        if (validationResult) {
            validationResult.textContent = 'Selecciona un nuevo archivo.';
            validationResult.className = 'result warning';
            validationResult.style.display = 'block';
        }
        
        // Limpiar estado
        this.fileHandler.clearFile();
        this.validationResult = null;
        this.updateVisualizationButtonState();
    }

    // Reintenta la carga
    retryUpload() {
        this.clearFile();
        this.dom.hideFilePreview();
        this.dom.hideError();
    }

    // Limpia el archivo cargado
    clearFile() {
        this.dom.clearFileInput();
        this.fileHandler.clearFile();
        this.dom.hideFileInfo();
        this.dom.hideResult();
        this.dom.hideFilePreview();
        this.dom.hideError();
        this.validationResult = null;
        this.currentView = 'upload';
        this.dom.showPage('upload');
        this.dom.hidePage('visualization');
        this.updateVisualizationButtonState();
    }

    // Actualiza el estado del botón de visualización según el resultado de validación
    updateVisualizationButtonState() {
        const visualizeBtn = document.getElementById('visualizeBtn');
        if (!visualizeBtn) return;
        
        if (this.validationResult && this.validationResult.isValid) {
            // Validación exitosa - habilitar botón
            visualizeBtn.disabled = false;
            visualizeBtn.classList.remove('disabled');
            visualizeBtn.title = 'Visualizar factura validada';
        } else {
            // Sin validación o validación fallida - deshabilitar botón
            visualizeBtn.disabled = true;
            visualizeBtn.classList.add('disabled');
            if (this.validationResult && !this.validationResult.isValid) {
                visualizeBtn.title = 'Primero debes validar el documento exitosamente';
            } else {
                visualizeBtn.title = 'Primero debes validar el documento';
            }
        }
    }

    // Obtiene el estado actual de la aplicación
    getAppState() {
        return {
            currentFile: this.fileHandler.hasFile(),
            currentView: this.currentView,
            isProcessing: this.processing,
            validationResult: this.validationResult,
            hasInvoice: this.visualizer ? this.visualizer.hasInvoice() : false
        };
    }
}
