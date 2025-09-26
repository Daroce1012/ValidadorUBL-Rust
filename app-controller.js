/**
 * Controlador Principal de la Aplicación
 * Coordina todos los componentes del validador UBL
 */
import { DOMManager } from './dom-manager.js';
import { FileHandler } from './file-handler.js';
import { UBLValidator } from './ubl-validator.js';
import { Logger } from './utils.js';

export class AppController {
    constructor() {
        this.dom = new DOMManager();
        this.fileHandler = new FileHandler();
        this.validator = new UBLValidator();
        this.processing = false;
    }

    // Inicializa la aplicación
    async initialize() {
        try {
            await this.validator.initialize();
            this._setupEvents();
            this._setupGlobalFunctions();
            Logger.info('✅ Aplicación inicializada correctamente');
        } catch (error) {
            Logger.error('❌ Error inicializando la aplicación:', error);
            this.dom.showResult('Error cargando el validador. Recarga la página.', 'error');
        }
    }

    // Configura eventos y funciones globales
    _setupEvents() {
        this.dom.setupEventListeners((file) => this._handleFileSelect(file));
    }

    _setupGlobalFunctions() {
        window.validar = () => this.validate();
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
        this.dom.showResult('Archivo cargado. Haz clic en "Validar Documento".', 'success');
        this._toggleClearButton(true);
    }

    // Valida el documento UBL
    async validate() {
        if (this.processing) return;
        
        if (!this.fileHandler.hasFile()) {
            this.dom.showResult('Carga un archivo XML UBL para validar.', 'warning');
            return;
        }
        
        this.processing = true;
        this.dom.setButtonState(true);
        this.dom.showResult('Validando documento...', 'loading');
        
        const content = this.fileHandler.getLoadedContent();
        await this.validator.validate(content, (message, type) => {
            this.dom.showResult(message, type);
        });
        
        this.processing = false;
        this.dom.setButtonState(false);
    }

    // Limpia el archivo cargado
    clearFile() {
        this.dom.clearFileInput();
        this.fileHandler.clearFile();
        this.dom.hideFileInfo();
        this.dom.hideResult();
        this.dom.showResult('Archivo eliminado. Selecciona otro archivo.', 'warning');
        this._toggleClearButton(false);
    }

    // Controla visibilidad del botón limpiar
    _toggleClearButton(show) {
        const clearButton = document.getElementById('clearButton');
        if (clearButton) clearButton.style.display = show ? 'block' : 'none';
    }
}
