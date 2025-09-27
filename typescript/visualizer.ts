/**
 * Visualizador Principal de Facturas UBL
 */
import { UBLInvoice, VisualizationOptions, ValidationResult, PDFGenerationOptions } from './types';
import { UBLXMLParser } from './xml-parser';
import { PDFGenerator } from './pdf-generator';
import { InvoiceFormatter } from './invoice-formatter';

export class UBLInvoiceVisualizer {
    private parser: UBLXMLParser;
    private pdfGenerator: PDFGenerator;
    private formatter: InvoiceFormatter;
    private currentInvoice: UBLInvoice | null = null;
    private validationResult: ValidationResult | null = null;

    constructor() {
        this.parser = new UBLXMLParser();
        this.pdfGenerator = new PDFGenerator();
        this.formatter = new InvoiceFormatter();
    }

    /**
     * Procesa un archivo XML y prepara la visualización
     */
    public async processXMLFile(xmlContent: string, validationResult?: ValidationResult): Promise<void> {
        try {
            this.currentInvoice = this.parser.parseUBLXML(xmlContent);
            this.validationResult = validationResult || null;
            this.displayInvoice(this.currentInvoice, { showValidationStatus: !!validationResult });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error al procesar el archivo XML: ${errorMessage}`);
        }
    }

    /**
     * Muestra la factura en la interfaz
     */
    private displayInvoice(invoice: UBLInvoice, options: VisualizationOptions): void {
        this.populateInvoiceDetails(invoice);
        this.populatePartiesInfo(invoice);
        this.populateInvoiceLines(invoice);
        this.populateTotalsInfo(invoice);
        
        if (options.showValidationStatus && this.validationResult) {
            this.showValidationStatus(this.validationResult);
        }
    }

    /**
     * Genera y descarga el PDF de la factura
     */
    public async generatePDF(options?: VisualizationOptions): Promise<void> {
        if (!this.currentInvoice) {
            throw new Error('No hay factura cargada para generar PDF');
        }

        const pdfOptions: PDFGenerationOptions = {
            includeValidationReport: options?.showValidationStatus && !!this.validationResult,
            validationResult: this.validationResult || undefined,
            ...options?.pdfOptions
        };

        await this.pdfGenerator.generateInvoicePDF(this.currentInvoice, pdfOptions);
    }

    /**
     * Genera PDF desde el contenido HTML actual
     */
    public async generatePDFFromHTML(): Promise<void> {
        const invoiceContent = document.querySelector('.invoice-content') as HTMLElement;
        if (!invoiceContent) {
            throw new Error('No se encontró el contenido de la factura para generar PDF');
        }

        const options = {
            includeValidation: !!this.validationResult,
            ...(this.validationResult && { validationResult: this.validationResult })
        };
        
        await this.pdfGenerator.generatePDFFromHTML(invoiceContent, options);
    }

    /**
     * Obtiene la factura actual
     */
    public getCurrentInvoice(): UBLInvoice | null {
        return this.currentInvoice;
    }

    /**
     * Obtiene el resultado de validación actual
     */
    public getValidationResult(): ValidationResult | null {
        return this.validationResult;
    }

    /**
     * Verifica si hay una factura cargada
     */
    public hasInvoice(): boolean {
        return this.currentInvoice !== null;
    }

    /**
     * Limpia la factura actual
     */
    public clearInvoice(): void {
        this.currentInvoice = null;
        this.validationResult = null;
    }

    // Métodos privados para populación de la interfaz
    private populateInvoiceDetails(invoice: UBLInvoice): void {
        const invoiceNumberEl = document.getElementById('invoiceNumber');
        const invoiceDateEl = document.getElementById('invoiceDate');
        const invoiceCurrencyEl = document.getElementById('invoiceCurrency');

        if (invoiceNumberEl) invoiceNumberEl.textContent = invoice.id;
        if (invoiceDateEl) invoiceDateEl.textContent = this.formatter.formatDate(invoice.issueDate);
        if (invoiceCurrencyEl) invoiceCurrencyEl.textContent = invoice.documentCurrencyCode;
    }

    private populatePartiesInfo(invoice: UBLInvoice): void {
        const supplierInfoEl = document.getElementById('supplierInfo');
        const customerInfoEl = document.getElementById('customerInfo');

        if (supplierInfoEl) {
            supplierInfoEl.innerHTML = this.formatter.formatPartyInfo(invoice.accountingSupplierParty);
        }
        if (customerInfoEl) {
            customerInfoEl.innerHTML = this.formatter.formatPartyInfo(invoice.accountingCustomerParty);
        }
    }

    private populateInvoiceLines(invoice: UBLInvoice): void {
        const tableBody = document.getElementById('invoiceTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        invoice.invoiceLines.forEach(line => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="description">${this.formatter.escapeHtml(line.item.description || line.item.name || 'Sin descripción')}</td>
                <td class="quantity">${line.quantity.toFixed(2)}</td>
                <td class="price">${this.formatter.formatCurrency(line.price.priceAmount, invoice.documentCurrencyCode)}</td>
                <td class="total">${this.formatter.formatCurrency(line.lineExtensionAmount, invoice.documentCurrencyCode)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    private populateTotalsInfo(invoice: UBLInvoice): void {
        const totalsContainer = document.getElementById('totalsInfo');
        if (!totalsContainer) return;

        totalsContainer.innerHTML = '';

        const totals = this.formatter.buildTotalsList(invoice.legalMonetaryTotals);
        
        totals.forEach(total => {
            const totalLine = document.createElement('div');
            totalLine.className = 'total-line';
            totalLine.innerHTML = `
                <span class="label">${this.formatter.escapeHtml(total.label)}:</span>
                <span class="value">${this.formatter.formatCurrency(total.value, invoice.documentCurrencyCode)}</span>
            `;
            totalsContainer.appendChild(totalLine);
        });

        this.formatter.addFinalTotal(invoice.legalMonetaryTotals.payableAmount, invoice.documentCurrencyCode, totalsContainer);
    }

    private showValidationStatus(validationResult: ValidationResult): void {
        const statusElement = document.getElementById('validationStatus');
        if (!statusElement) return;

        const statusClass = validationResult.isValid ? 'valid' : 'invalid';
        const statusIcon = validationResult.isValid ? '✅' : '❌';

        statusElement.innerHTML = `
            <div class="validation-status ${statusClass}">
                <span class="status-icon">${statusIcon}</span>
                <span class="status-text">${validationResult.message}</span>
                ${validationResult.errors ? `<div class="validation-errors">${validationResult.errors.join('<br>')}</div>` : ''}
            </div>
        `;
    }

    /**
     * Muestra un mensaje de éxito
     */
    public showSuccessMessage(message: string): void {
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

    /**
     * Muestra un mensaje de error
     */
    public showErrorMessage(message: string): void {
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
}
